<?php

namespace Tests\Feature\Couple;

use App\Models\Invitation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomDomainRedirectTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_redirects_public_invitation_to_verified_custom_domain_for_pro_user(): void
    {
        $user = User::factory()->create([
            'plan' => 'premium',
            'email_verified_at' => now(),
        ]);

        Invitation::create([
            'user_id' => $user->id,
            'slug' => 'custom-domain-slug',
            'guest_code' => 'CDR001',
            'status' => 'published',
            'custom_domain' => 'yourwedding.com',
            'custom_domain_status' => 'verified',
            'custom_domain_verified_at' => now(),
        ]);

        $response = $this->withServerVariables([
            'HTTP_HOST' => 'wedding-online.com',
        ])->get('/i/custom-domain-slug');

        $response->assertStatus(302);
        $response->assertRedirect('https://yourwedding.com/i/custom-domain-slug');
    }
}

