<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invitations', function (Blueprint $table): void {
            $table->unsignedInteger('guest_limit')->default(25)->after('guest_code');
        });

        DB::table('invitations')
            ->whereIn('user_id', function ($query): void {
                $query->select('id')
                    ->from('users')
                    ->where('plan', 'premium');
            })
            ->update([
                'guest_limit' => 250,
            ]);
    }

    public function down(): void
    {
        Schema::table('invitations', function (Blueprint $table): void {
            $table->dropColumn('guest_limit');
        });
    }
};
