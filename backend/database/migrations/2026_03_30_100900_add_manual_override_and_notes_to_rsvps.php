<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rsvps', function (Blueprint $table) {
            $table->timestamp('manually_overridden_at')->nullable()->after('submitted_at');
            $table->foreignId('manually_overridden_by')
                ->nullable()
                ->after('manually_overridden_at')
                ->constrained('users')
                ->nullOnDelete();
        });

        Schema::create('rsvp_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rsvp_id')->constrained('rsvps')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->text('note');
            $table->timestamps();

            $table->index(['rsvp_id', 'created_at']);
        });

        Schema::create('rsvp_audits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rsvp_id')->constrained('rsvps')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->json('before_payload');
            $table->json('after_payload');
            $table->timestamps();

            $table->index(['rsvp_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rsvp_audits');
        Schema::dropIfExists('rsvp_notes');

        Schema::table('rsvps', function (Blueprint $table) {
            $table->dropConstrainedForeignId('manually_overridden_by');
            $table->dropColumn('manually_overridden_at');
        });
    }
};
