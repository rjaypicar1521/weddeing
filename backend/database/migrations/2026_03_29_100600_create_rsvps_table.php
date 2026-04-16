<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rsvps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invitation_id')->constrained('invitations')->cascadeOnDelete();
            $table->string('guest_name');
            $table->boolean('attending')->default(false);
            $table->string('plus_one_name')->nullable();
            $table->string('meal_preference')->nullable();
            $table->string('transport')->nullable();
            $table->text('favorite_memory')->nullable();
            $table->text('message_to_couple')->nullable();
            $table->string('confirmation_code')->unique();
            $table->string('ip_address', 45)->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();

            $table->index(['invitation_id', 'attending']);
            $table->index('submitted_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rsvps');
    }
};
