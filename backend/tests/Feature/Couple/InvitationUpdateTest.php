<?php

namespace Tests\Feature\Couple;

use App\Models\Invitation;
use App\Models\MediaFile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class InvitationUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_invitation_can_be_bootstrapped_for_verified_couple(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
            'name' => 'Jamie Rivera',
        ]);

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/invitation');

        $response->assertCreated()
            ->assertJsonPath('invitation.status', 'draft');

        $this->assertDatabaseHas('invitations', [
            'user_id' => $user->id,
            'status' => 'draft',
        ]);
    }

    public function test_invitation_update_saves_wedding_details_and_returns_updated_invitation(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        Sanctum::actingAs($user);

        $response = $this->putJson('/api/v1/invitation', [
            'partner1_name' => 'Andrea',
            'partner2_name' => 'Miguel',
            'wedding_date' => now()->addDays(30)->toDateString(),
            'wedding_time' => '15:30',
            'venue_name' => 'Manila Cathedral',
            'venue_address' => 'Intramuros, Manila',
            'dress_code' => 'Semi-formal',
            'dress_code_colors' => ['#FFFFFF', '#C4A484'],
            'schedule' => [
                [
                    'time' => '14:30',
                    'event' => 'Guest Arrival',
                    'description' => 'Please arrive 30 minutes early.',
                ],
                [
                    'time' => '15:30',
                    'event' => 'Ceremony',
                    'description' => null,
                ],
            ],
        ]);

        $response->assertOk()
            ->assertJsonPath('invitation.partner1_name', 'Andrea')
            ->assertJsonPath('invitation.partner2_name', 'Miguel')
            ->assertJsonPath('invitation.venue_name', 'Manila Cathedral');

        $this->assertDatabaseHas('invitations', [
            'user_id' => $user->id,
            'partner1_name' => 'Andrea',
            'partner2_name' => 'Miguel',
            'venue_name' => 'Manila Cathedral',
        ]);

        $invitation = Invitation::where('user_id', $user->id)->firstOrFail();

        $this->assertSame(['#FFFFFF', '#C4A484'], $invitation->dress_code_colors);
        $this->assertCount(2, $invitation->schedule ?? []);
    }

    public function test_invitation_update_rejects_past_wedding_date(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        Sanctum::actingAs($user);

        $this->putJson('/api/v1/invitation', [
            'partner1_name' => 'Andrea',
            'partner2_name' => 'Miguel',
            'wedding_date' => now()->subDay()->toDateString(),
            'venue_name' => 'Manila Cathedral',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['wedding_date']);
    }

    public function test_invitation_update_rejects_schedule_item_with_invalid_time_format(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        Sanctum::actingAs($user);

        $this->putJson('/api/v1/invitation', [
            'partner1_name' => 'Andrea',
            'partner2_name' => 'Miguel',
            'wedding_date' => now()->addDays(30)->toDateString(),
            'venue_name' => 'Manila Cathedral',
            'schedule' => [
                [
                    'time' => '2PM',
                    'event' => 'Ceremony Begins',
                    'description' => 'Church of the Holy Family',
                ],
            ],
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['schedule.0.time']);
    }

    public function test_invitation_update_rejects_schedule_item_without_event_name(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        Sanctum::actingAs($user);

        $this->putJson('/api/v1/invitation', [
            'partner1_name' => 'Andrea',
            'partner2_name' => 'Miguel',
            'wedding_date' => now()->addDays(30)->toDateString(),
            'venue_name' => 'Manila Cathedral',
            'schedule' => [
                [
                    'time' => '14:00',
                    'description' => 'Church of the Holy Family',
                ],
            ],
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['schedule.0.event']);
    }

    public function test_invitation_update_rejects_schedule_payload_with_more_than_twenty_items(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        Sanctum::actingAs($user);

        $schedule = [];
        for ($index = 0; $index < 21; $index++) {
            $schedule[] = [
                'time' => '14:00',
                'event' => 'Event ' . $index,
                'description' => 'Description ' . $index,
            ];
        }

        $this->putJson('/api/v1/invitation', [
            'partner1_name' => 'Andrea',
            'partner2_name' => 'Miguel',
            'wedding_date' => now()->addDays(30)->toDateString(),
            'venue_name' => 'Manila Cathedral',
            'schedule' => $schedule,
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['schedule']);
    }

    public function test_invitation_update_requires_partner_names_and_venue_name(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        Sanctum::actingAs($user);

        $this->putJson('/api/v1/invitation', [
            'wedding_date' => now()->addDays(10)->toDateString(),
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['partner1_name', 'partner2_name', 'venue_name']);
    }

    public function test_invitation_update_saves_gift_methods_when_qr_files_exist(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        Sanctum::actingAs($user);

        $invitation = Invitation::create([
            'user_id' => $user->id,
            'slug' => 'gift-methods-slug',
            'guest_code' => 'GFT123',
            'status' => 'draft',
        ]);

        MediaFile::create([
            'invitation_id' => $invitation->id,
            'user_id' => $user->id,
            'type' => 'qr_code',
            'file_path' => 'users/' . $user->id . '/qr/gcash.png',
            'file_name' => 'gcash.png',
            'file_size_bytes' => 1000,
            'mime_type' => 'image/png',
            'sort_order' => 0,
        ]);

        $response = $this->putJson('/api/v1/invitation', [
            'gift_methods' => [
                [
                    'label' => 'GCash',
                    'qr_path' => '/users/' . $user->id . '/qr/gcash.png',
                    'account_name' => 'Juan Dela Cruz',
                    'account_number' => '09123456789',
                ],
            ],
        ]);

        $response->assertOk()
            ->assertJsonPath('invitation.gift_methods.0.label', 'GCash')
            ->assertJsonPath('invitation.gift_methods.0.qr_path', '/users/' . $user->id . '/qr/gcash.png');
    }

    public function test_invitation_update_preserves_existing_wedding_details_when_saving_gift_methods_only(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        Sanctum::actingAs($user);

        $invitation = Invitation::create([
            'user_id' => $user->id,
            'slug' => 'gift-methods-preserve-fields',
            'guest_code' => 'GFT125',
            'status' => 'draft',
            'partner1_name' => 'Alex',
            'partner2_name' => 'Jamie',
            'wedding_date' => now()->addDays(30)->toDateString(),
            'wedding_time' => '15:00',
            'venue_name' => 'Manila Cathedral',
            'venue_address' => 'Intramuros, Manila',
            'dress_code' => 'Burgundy Formal',
            'dress_code_colors' => ['#800020', '#F3E9E4'],
            'schedule' => [
                [
                    'time' => '14:30',
                    'event' => 'Guest Arrival',
                    'description' => 'Please arrive early.',
                ],
            ],
        ]);

        MediaFile::create([
            'invitation_id' => $invitation->id,
            'user_id' => $user->id,
            'type' => 'qr_code',
            'file_path' => 'users/' . $user->id . '/qr/gcash-preserve.png',
            'file_name' => 'gcash-preserve.png',
            'file_size_bytes' => 1000,
            'mime_type' => 'image/png',
            'sort_order' => 0,
        ]);

        $response = $this->putJson('/api/v1/invitation', [
            'gift_methods' => [
                [
                    'label' => 'GCash',
                    'qr_path' => '/users/' . $user->id . '/qr/gcash-preserve.png',
                    'account_name' => 'Alex Rivera and Jamie Santos',
                    'account_number' => '09171234567',
                ],
            ],
        ]);

        $response->assertOk()
            ->assertJsonPath('invitation.partner1_name', 'Alex')
            ->assertJsonPath('invitation.partner2_name', 'Jamie')
            ->assertJsonPath('invitation.venue_name', 'Manila Cathedral')
            ->assertJsonPath('invitation.schedule.0.event', 'Guest Arrival')
            ->assertJsonPath('invitation.gift_methods.0.label', 'GCash');

        $invitation->refresh();

        $this->assertSame('Alex', $invitation->partner1_name);
        $this->assertSame('Jamie', $invitation->partner2_name);
        $this->assertSame('Manila Cathedral', $invitation->venue_name);
        $this->assertSame('Intramuros, Manila', $invitation->venue_address);
        $this->assertSame('Burgundy Formal', $invitation->dress_code);
        $this->assertSame(['#800020', '#F3E9E4'], $invitation->dress_code_colors);
        $this->assertSame('Guest Arrival', $invitation->schedule[0]['event']);
    }

    public function test_invitation_update_rejects_gift_method_when_qr_file_is_missing(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        Sanctum::actingAs($user);

        Invitation::create([
            'user_id' => $user->id,
            'slug' => 'gift-missing-qr',
            'guest_code' => 'GFT124',
            'status' => 'draft',
        ]);

        $this->putJson('/api/v1/invitation', [
            'gift_methods' => [
                [
                    'label' => 'Bank Deposit',
                    'qr_path' => '/users/' . $user->id . '/qr/bank.png',
                    'account_name' => 'Juan Dela Cruz',
                    'account_number' => '1234567890',
                ],
            ],
        ])
            ->assertUnprocessable()
            ->assertJson([
                'message' => 'Gift method at index 0 uses a QR code that does not exist.',
            ]);
    }
}

