<?php

namespace Database\Seeders;

use App\Models\Invitation;
use App\Models\InvitationTemplate;
use App\Models\GuestGroup;
use App\Models\Rsvp;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class LocalDemoSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::query()->updateOrCreate(
            ['email' => 'pro.test@example.com'],
            [
                'name' => 'Pro Test User',
                'password' => Hash::make('Password123'),
                'plan' => 'premium',
                'email_verified_at' => now(),
                'storage_used_bytes' => 0,
                'storage_limit_bytes' => 5368709120,
            ],
        );

        $templateId = InvitationTemplate::query()
            ->where('slug', 'filipino-classic')
            ->value('id');

        $invitation = Invitation::query()->updateOrCreate(
            ['user_id' => $user->id],
            [
                'slug' => 'alex-rivera-jamie-santos-mc29vx',
                'guest_code' => '8TK8MX',
                'guest_limit' => 250,
                'status' => 'published',
                'partner1_name' => 'Alex Rivera',
                'partner2_name' => 'Jamie Santos',
                'wedding_date' => '2026-12-12',
                'wedding_time' => '15:00',
                'venue_name' => 'Manila Cathedral',
                'venue_address' => '',
                'dress_code' => 'Filipiniana or formal attire',
                'dress_code_colors' => ['#D4A373', '#CCD5AE', '#E9EDC9'],
                'template_id' => $templateId,
                'color_palette' => ['primary' => '#D4A373', 'accent' => '#CCD5AE'],
                'music_url' => null,
                'prenup_video_url' => null,
                'gift_methods' => [],
                'schedule' => [
                    ['time' => '3:00 PM', 'event' => 'Ceremony', 'description' => 'Wedding ceremony begins'],
                    ['time' => '5:00 PM', 'event' => 'Reception', 'description' => 'Dinner and celebration'],
                ],
                'published_at' => now(),
            ],
        );

        $guests = [
            [
                'guest_name' => 'Taylor Guest',
                'email' => 'taylor.guest@example.com',
                'group_name' => 'Santos Family',
                'guest_status' => 'attending',
                'attending' => true,
                'meal_preference' => 'Beef',
                'transport' => 'has_car',
                'confirmation_code' => '3YNJAT',
                'submitted_at' => now(),
                'invited_at' => now()->subDays(2),
            ],
            [
                'guest_name' => 'Morgan Guest',
                'email' => 'morgan.guest@example.com',
                'group_name' => 'Bride Team',
                'guest_status' => 'invited',
                'attending' => false,
                'confirmation_code' => '7PLK2Q',
                'submitted_at' => null,
                'invited_at' => now()->subDay(),
            ],
        ];

        $defaultGroup = $invitation->defaultGuestGroup()->first();
        if ($defaultGroup) {
            $defaultGroup->forceFill([
                'access_code' => '8TK8MX',
                'name' => 'General Guests',
            ])->save();
        }

        $groupIds = [
            'Santos Family' => GuestGroup::query()->updateOrCreate(
                ['invitation_id' => $invitation->id, 'name' => 'Santos Family'],
                ['access_code' => 'SFM246', 'status' => 'active', 'is_default' => false],
            )->id,
            'Bride Team' => GuestGroup::query()->updateOrCreate(
                ['invitation_id' => $invitation->id, 'name' => 'Bride Team'],
                ['access_code' => 'BRD357', 'status' => 'active', 'is_default' => false],
            )->id,
        ];

        foreach ($guests as $guest) {
            $groupName = $guest['group_name'];
            unset($guest['group_name']);

            Rsvp::query()->updateOrCreate(
                [
                    'invitation_id' => $invitation->id,
                    'email' => $guest['email'],
                ],
                $guest + [
                    'invitation_id' => $invitation->id,
                    'guest_group_id' => $groupIds[$groupName] ?? $defaultGroup?->id,
                ],
            );
        }
    }
}
