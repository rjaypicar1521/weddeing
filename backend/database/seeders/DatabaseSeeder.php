<?php

namespace Database\Seeders;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            InvitationTemplateSeeder::class,
        ]);

        if (app()->environment('local')) {
            $this->call([
                LocalDemoSeeder::class,
            ]);
        }

        DB::table('users')->updateOrInsert([
            'email' => 'test@example.com',
        ], [
            'name' => 'Test User',
            'email_verified_at' => now(),
            'password' => Hash::make('password'),
            'remember_token' => null,
            'updated_at' => now(),
            'created_at' => now(),
        ]);
    }
}
