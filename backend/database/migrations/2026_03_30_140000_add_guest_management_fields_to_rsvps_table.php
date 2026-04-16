<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rsvps', function (Blueprint $table): void {
            $table->string('email')->nullable()->after('guest_name');
            $table->string('guest_status', 32)->default('invited')->after('email');
            $table->timestamp('invited_at')->nullable()->after('guest_status');
            $table->softDeletes();

            $table->index('email');
            $table->index('guest_status');
            $table->index('invited_at');
        });
    }

    public function down(): void
    {
        Schema::table('rsvps', function (Blueprint $table): void {
            $table->dropIndex(['email']);
            $table->dropIndex(['guest_status']);
            $table->dropIndex(['invited_at']);
            $table->dropSoftDeletes();
            $table->dropColumn(['email', 'guest_status', 'invited_at']);
        });
    }
};
