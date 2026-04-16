<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admin_reminders', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('invitation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('rsvp_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sent_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('recipient_email');
            $table->string('status', 16)->default('queued');
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('opened_at')->nullable();
            $table->timestamp('clicked_at')->nullable();
            $table->string('error_message', 500)->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->index('rsvp_id');
            $table->index('invitation_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_reminders');
    }
};
