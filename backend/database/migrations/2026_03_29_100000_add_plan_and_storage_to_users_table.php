<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('plan')->default('free')->after('password');
            $table->unsignedBigInteger('storage_used_bytes')->default(0)->after('plan');
            $table->unsignedBigInteger('storage_limit_bytes')->default(52428800)->after('storage_used_bytes');
            $table->boolean('is_admin')->default(false)->after('storage_limit_bytes');

            $table->index('plan');
            $table->index('is_admin');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['plan']);
            $table->dropIndex(['is_admin']);
            $table->dropColumn(['plan', 'storage_used_bytes', 'storage_limit_bytes', 'is_admin']);
        });
    }
};
