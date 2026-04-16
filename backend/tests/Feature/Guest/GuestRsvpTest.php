<?php

namespace Tests\Feature\Guest;

use App\Events\GuestRsvpSubmitted;
use App\Listeners\SendRsvpNotificationToCouple;
use App\Models\Invitation;
use App\Models\Rsvp;
use App\Models\User;
use App\Jobs\ProcessRsvpNotificationEmail;
use App\Services\GuestTokenService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Tests\TestCase;

class GuestRsvpTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_can_submit_rsvp_once_per_token(): void
    {
        Bus::fake();

        [$token, $invitation, $guest] = $this->createGuestToken();

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/guest/rsvp', [
                'guest_id' => $guest->id,
                'attending' => true,
                'plus_one_name' => 'Marco Reyes',
                'meal_preference' => 'Fish',
                'transport' => 'has_car',
                'favorite_memory' => 'College barkada days',
                'message_to_couple' => 'Congrats!',
            ]);

        $response->assertCreated()
            ->assertJsonPath('rsvp.guest_name', 'Ana Reyes')
            ->assertJsonPath('rsvp.attending', true);

        $this->assertMatchesRegularExpression('/^[A-Z2-9]{6}$/', (string) $response->json('confirmation_code'));
        $this->assertDatabaseHas('rsvps', [
            'invitation_id' => $invitation->id,
            'guest_name' => 'Ana Reyes',
            'guest_group_id' => $invitation->defaultGuestGroup()->first()?->id,
        ]);
        Bus::assertDispatched(ProcessRsvpNotificationEmail::class);

        $duplicateResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/guest/rsvp', [
                'guest_id' => $guest->id,
                'attending' => false,
            ]);

        $duplicateResponse->assertStatus(422)
            ->assertJson([
                'message' => 'This guest already has a recorded RSVP.',
            ]);
    }

    public function test_guest_rsvp_validation_is_enforced(): void
    {
        [$token] = $this->createGuestToken();

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/guest/rsvp', [
                'attending' => true,
                'meal_preference' => 'Pasta',
                'transport' => 'bus',
                'favorite_memory' => str_repeat('x', 301),
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors([
                'meal_preference',
                'transport',
                'favorite_memory',
            ]);
    }

    public function test_guest_can_submit_attending_rsvp_without_plus_one(): void
    {
        [$token, $invitation, $guest] = $this->createGuestToken('Taylor Guest');

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/guest/rsvp', [
                'guest_id' => $guest->id,
                'attending' => true,
                'plus_one_name' => null,
                'meal_preference' => 'Beef',
                'transport' => 'has_car',
            ]);

        $response->assertCreated()
            ->assertJsonPath('rsvp.guest_name', 'Taylor Guest')
            ->assertJsonPath('rsvp.plus_one_name', null);

        $this->assertDatabaseHas('rsvps', [
            'invitation_id' => $invitation->id,
            'guest_name' => 'Taylor Guest',
            'plus_one_name' => null,
        ]);
    }

    public function test_guest_can_check_existing_rsvp_by_token(): void
    {
        [$token, $invitation, $guest] = $this->createGuestToken('Paolo Cruz');

        $getBefore = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/guest/rsvp');

        $getBefore->assertOk()->assertJson([
            'rsvp' => null,
            'rsvps' => [],
        ]);

        $tokenHash = hash('sha256', $token);
        $guest->update([
            'attending' => true,
            'confirmation_code' => 'A3M5Q8',
            'guest_token_hash' => $tokenHash,
            'submitted_at' => now(),
        ]);

        $getAfter = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/guest/rsvp');

        $getAfter->assertOk()
            ->assertJsonPath('rsvp.id', $guest->id)
            ->assertJsonPath('rsvp.confirmation_code', 'A3M5Q8')
            ->assertJsonPath('rsvps.0.id', $guest->id);
    }

    public function test_guest_can_submit_multiple_rsvps_for_different_group_members(): void
    {
        [$token, $invitation, $guest] = $this->createGuestToken('Taylor Guest');
        $secondGuest = Rsvp::create([
            'invitation_id' => $invitation->id,
            'guest_group_id' => $invitation->defaultGuestGroup()->first()?->id,
            'guest_name' => 'Morgan Guest',
            'email' => 'morgan@example.com',
            'guest_status' => 'invited',
            'invited_at' => now(),
            'attending' => false,
            'confirmation_code' => 'MRG001',
        ]);

        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/guest/rsvp', [
                'guest_id' => $guest->id,
                'attending' => true,
                'meal_preference' => 'Beef',
                'transport' => 'has_car',
            ])
            ->assertCreated();

        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/guest/rsvp', [
                'guest_id' => $secondGuest->id,
                'attending' => false,
            ])
            ->assertCreated()
            ->assertJsonPath('rsvp.guest_name', 'Morgan Guest');

        $this->assertNotNull($guest->fresh()?->submitted_at);
        $this->assertDatabaseHas('rsvps', [
            'id' => $secondGuest->id,
            'guest_status' => 'declined',
        ]);
    }

    public function test_rsvp_notification_job_tolerates_mail_delivery_failures(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        $invitation = Invitation::create([
            'user_id' => $user->id,
            'slug' => 'rsvp-mail-failure',
            'guest_code' => 'RMF001',
            'status' => 'published',
            'partner1_name' => 'Alex',
            'partner2_name' => 'Jamie',
        ]);

        $rsvp = Rsvp::create([
            'invitation_id' => $invitation->id,
            'guest_name' => 'Taylor Guest',
            'attending' => true,
            'confirmation_code' => 'RMF123',
            'submitted_at' => now(),
        ]);

        config([
            'mail.default' => 'smtp',
            'mail.mailers.smtp.host' => '127.0.0.1',
            'mail.mailers.smtp.port' => 1,
            'mail.mailers.smtp.encryption' => null,
            'mail.mailers.smtp.username' => null,
            'mail.mailers.smtp.password' => null,
            'mail.mailers.smtp.timeout' => 1,
        ]);

        $job = new ProcessRsvpNotificationEmail($rsvp->id, 'submitted');
        $job->handle();

        $this->assertDatabaseHas('rsvps', [
            'id' => $rsvp->id,
            'confirmation_code' => 'RMF123',
        ]);
    }

    public function test_rsvp_listener_tolerates_guest_boarding_pass_mail_failures(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        $invitation = Invitation::create([
            'user_id' => $user->id,
            'slug' => 'boarding-pass-mail-failure',
            'guest_code' => 'BMF001',
            'status' => 'published',
            'partner1_name' => 'Alex',
            'partner2_name' => 'Jamie',
        ]);

        $rsvp = Rsvp::create([
            'invitation_id' => $invitation->id,
            'guest_name' => 'guest@example.com',
            'attending' => true,
            'confirmation_code' => 'BMF123',
            'submitted_at' => now(),
        ]);

        config([
            'mail.default' => 'smtp',
            'mail.mailers.smtp.host' => '127.0.0.1',
            'mail.mailers.smtp.port' => 1,
            'mail.mailers.smtp.encryption' => null,
            'mail.mailers.smtp.username' => null,
            'mail.mailers.smtp.password' => null,
            'mail.mailers.smtp.timeout' => 1,
            'queue.default' => 'sync',
        ]);

        $listener = new SendRsvpNotificationToCouple();
        $listener->handleSubmitted(new GuestRsvpSubmitted($rsvp));

        $this->assertDatabaseHas('rsvps', [
            'id' => $rsvp->id,
            'confirmation_code' => 'BMF123',
        ]);
    }

    /**
     * @return array{0: string, 1: Invitation, 2: Rsvp}
     */
    private function createGuestToken(string $guestName = 'Ana Reyes'): array
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        $invitation = Invitation::create([
            'user_id' => $user->id,
            'slug' => 'ana-miguel',
            'guest_code' => 'X7K2P9',
            'status' => 'published',
        ]);

        $group = $invitation->defaultGuestGroup()->first();
        $guest = Rsvp::create([
            'invitation_id' => $invitation->id,
            'guest_group_id' => $group?->id,
            'guest_name' => $guestName,
            'email' => strtolower(str_replace(' ', '.', $guestName)) . '@example.com',
            'guest_status' => 'invited',
            'invited_at' => now(),
            'attending' => false,
            'confirmation_code' => 'RSV6K2',
        ]);
        $token = app(GuestTokenService::class)->issueToken($invitation, $group);

        return [$token, $invitation, $guest];
    }
}
