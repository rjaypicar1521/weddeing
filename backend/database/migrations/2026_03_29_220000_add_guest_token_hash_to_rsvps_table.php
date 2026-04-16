<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rsvps', function (Blueprint $table) {
            $table->string('guest_token_hash', 64)->nullable()->after('confirmation_code');
            $table->unique('guest_token_hash');
        });
    }

    public function down(): void
    {
        Schema::table('rsvps', function (Blueprint $table) {
            $table->dropUnique(['guest_token_hash']);
            $table->dropColumn('guest_token_hash');
        });
    }
};

