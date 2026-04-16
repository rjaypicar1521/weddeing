<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('guest_groups', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('invitation_id')->constrained()->cascadeOnDelete();
            $table->string('name', 120);
            $table->string('access_code', 6)->unique();
            $table->string('status', 20)->default('active');
            $table->boolean('is_default')->default(false);
            $table->timestamps();

            $table->index(['invitation_id', 'status']);
        });

        $invitations = DB::table('invitations')
            ->select(['id', 'guest_code'])
            ->get();

        $now = now();
        foreach ($invitations as $invitation) {
            DB::table('guest_groups')->insert([
                'invitation_id' => $invitation->id,
                'name' => 'General Guests',
                'access_code' => $invitation->guest_code,
                'status' => 'active',
                'is_default' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('guest_groups');
    }
};
