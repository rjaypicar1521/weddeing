<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscriptions', function (Blueprint $table): void {
            if (Schema::hasColumn('subscriptions', 'paymongo_payment_id')) {
                $table->dropUnique('subscriptions_paymongo_payment_id_unique');
                $table->dropColumn('paymongo_payment_id');
            }

            if (! Schema::hasColumn('subscriptions', 'stripe_event_id')) {
                $table->string('stripe_event_id')->nullable()->after('user_id');
                $table->string('stripe_checkout_session_id')->nullable()->after('stripe_event_id');
                $table->string('stripe_payment_intent_id')->nullable()->after('stripe_checkout_session_id');
                $table->string('stripe_customer_id')->nullable()->after('stripe_payment_intent_id');
                $table->string('currency', 10)->default('usd')->after('amount');
                $table->json('meta')->nullable()->after('paid_at');

                $table->unique('stripe_event_id');
                $table->unique('stripe_checkout_session_id');
                $table->index('stripe_customer_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table): void {
            if (Schema::hasColumn('subscriptions', 'stripe_event_id')) {
                $table->dropUnique(['stripe_event_id']);
                $table->dropUnique(['stripe_checkout_session_id']);
                $table->dropIndex(['stripe_customer_id']);

                $table->dropColumn([
                    'stripe_event_id',
                    'stripe_checkout_session_id',
                    'stripe_payment_intent_id',
                    'stripe_customer_id',
                    'currency',
                    'meta',
                ]);
            }

            if (! Schema::hasColumn('subscriptions', 'paymongo_payment_id')) {
                $table->string('paymongo_payment_id')->nullable()->after('user_id');
                $table->unique('paymongo_payment_id');
            }
        });
    }
};

