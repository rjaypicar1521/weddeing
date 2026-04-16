<?php

namespace Tests\Feature\Couple;

use App\Jobs\ProcessRsvpNotificationEmail;
use App\Models\Invitation;
use App\Models\Rsvp;
use App\Models\User;
use App\Notifications\CoupleRsvpNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class RsvpNotificationRateLimitTest extends TestCase
{
    use RefreshDatabase;

    public function test_rsvp_notification_is_limited_to_ten_per_hour_per_wedding(): void
    {
        Notification::fake();

        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        $invitation = Invitation::create([
            'user_id' => $user->id,
            'slug' => 'notify-limit',
            'guest_code' => 'RSVPA1',
            'status' => 'published',
        ]);

        $rsvp = Rsvp::create([
            'invitation_id' => $invitation->id,
            'guest_name' => 'Rate Limit Guest',
            'attending' => true,
            'confirmation_code' => 'MAIL01',
            'guest_token_hash' => 'mail-token-1',
            'submitted_at' => now(),
        ]);

        $key = 'rsvp-email:' . $invitation->id;
        RateLimiter::clear($key);

        for ($index = 0; $index < 11; $index++) {
            (new ProcessRsvpNotificationEmail($rsvp->id, 'submitted'))->handle();
        }

        Notification::assertSentToTimes($user, CoupleRsvpNotification::class, 10);
    }
}
