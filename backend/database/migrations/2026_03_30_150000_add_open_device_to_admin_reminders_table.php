<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('admin_reminders', function (Blueprint $table): void {
            $table->string('open_device', 16)->nullable()->after('opened_at');
            $table->index('open_device');
        });
    }

    public function down(): void
    {
        Schema::table('admin_reminders', function (Blueprint $table): void {
            $table->dropIndex(['open_device']);
            $table->dropColumn('open_device');
        });
    }
};
