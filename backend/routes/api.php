<?php

use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\Auth\SessionController;
use App\Http\Controllers\Auth\VerificationController;
use App\Http\Controllers\Admin\AdminActivityController;
use App\Http\Controllers\Admin\AdminGuestController;
use App\Http\Controllers\Admin\AdminInviteAnalyticsController;
use App\Http\Controllers\Admin\AdminOverviewController;
use App\Http\Controllers\Admin\AdminReminderController;
use App\Http\Controllers\Couple\EntourageController;
use App\Http\Controllers\Couple\GuestController as CoupleGuestController;
use App\Http\Controllers\Couple\GuestGroupController;
use App\Http\Controllers\Couple\InvitationController;
use App\Http\Controllers\Couple\LoveStoryController;
use App\Http\Controllers\Couple\MediaController;
use App\Http\Controllers\Couple\RsvpController;
use App\Http\Controllers\Couple\TemplateController;
use App\Http\Controllers\Guest\GuestAccessController;
use App\Http\Controllers\Guest\GuestRsvpController;
use App\Http\Controllers\Guest\GuestWishController;
use App\Http\Controllers\Payment\PaymentController;
use Illuminate\Support\Facades\Route;

Route::post('/stripe/webhook', [PaymentController::class, 'webhook']);

Route::prefix('v1')->group(function () {
    Route::post('/guest/validate-code', [GuestAccessController::class, 'validateCode'])
        ->middleware('throttle:guest-code-validate');

    Route::middleware('auth.guest')->group(function () {
        Route::get('/guest/invitation', [GuestAccessController::class, 'showInvitation']);
        Route::get('/guest/rsvp', [GuestRsvpController::class, 'show']);
        Route::post('/guest/rsvp', [GuestRsvpController::class, 'store'])
            ->middleware('throttle:guest-rsvp-submit');
        Route::get('/guest/wishes', [GuestWishController::class, 'index']);
        Route::post('/guest/wishes', [GuestWishController::class, 'store'])
            ->middleware('throttle:guest-wish-submit');
        Route::post('/guest/wishes/{id}/flag', [GuestWishController::class, 'flag'])
            ->middleware('throttle:guest-wish-flag');
    });

    Route::prefix('auth')->middleware('web')->group(function () {
        Route::post('/login', [SessionController::class, 'login'])
            ->middleware('throttle:10,1');

        Route::post('/register', [RegisterController::class, 'store'])
            ->middleware('throttle:10,15');

        Route::post('/logout', [SessionController::class, 'logout'])
            ->middleware('auth:sanctum');

        Route::get('/user', [SessionController::class, 'user'])
            ->middleware('auth:sanctum');

        Route::post('/email/verify/{id}/{hash}', [VerificationController::class, 'verify'])
            ->middleware('throttle:6,1')
            ->name('verification.verify');

        Route::post('/email/resend', [VerificationController::class, 'resend'])
            ->middleware(['auth:sanctum', 'throttle:6,1']);
    });

    Route::middleware(['auth:sanctum', 'verified.api'])->group(function () {
        Route::get('/invitation', [InvitationController::class, 'show']);
        Route::post('/invitation', [InvitationController::class, 'store']);
        Route::put('/invitation', [InvitationController::class, 'update']);
        Route::post('/invitation/publish', [InvitationController::class, 'publish']);
        Route::post('/invitation/unpublish', [InvitationController::class, 'unpublish']);
        Route::get('/invitation/preview', [InvitationController::class, 'preview']);
        Route::post('/invitation/regenerate-code', [InvitationController::class, 'regenerateCode'])
            ->middleware('throttle:guest-code-regenerate');
        Route::get('/templates', [TemplateController::class, 'index']);
        Route::get('/entourage', [EntourageController::class, 'index']);
        Route::post('/entourage', [EntourageController::class, 'store']);
        Route::put('/entourage/{id}', [EntourageController::class, 'update']);
        Route::delete('/entourage/{id}', [EntourageController::class, 'destroy']);
        Route::post('/entourage/reorder', [EntourageController::class, 'reorder']);
        Route::get('/love-story', [LoveStoryController::class, 'index']);
        Route::post('/love-story', [LoveStoryController::class, 'store']);
        Route::put('/love-story/{id}', [LoveStoryController::class, 'update']);
        Route::delete('/love-story/{id}', [LoveStoryController::class, 'destroy']);
        Route::post('/love-story/reorder', [LoveStoryController::class, 'reorder']);
        Route::get('/media', [MediaController::class, 'index']);
        Route::post('/media/upload', [MediaController::class, 'upload'])->middleware('check.storage.quota');
        Route::delete('/media/{id}', [MediaController::class, 'destroy']);
        Route::get('/rsvps', [RsvpController::class, 'index']);
        Route::get('/rsvps/stats', [RsvpController::class, 'stats']);
        Route::get('/rsvps/export', [RsvpController::class, 'export'])
            ->middleware('throttle:rsvp-export');
        Route::patch('/rsvps/{id}', [RsvpController::class, 'update']);
        Route::post('/rsvps/{id}/note', [RsvpController::class, 'storeNote']);
        Route::get('/guests', [CoupleGuestController::class, 'index']);
        Route::post('/guests/bulk-invite', [CoupleGuestController::class, 'bulkInvite'])
            ->middleware('check.guest.limit');
        Route::delete('/guests/{id}', [CoupleGuestController::class, 'destroy']);
        Route::patch('/guests/{id}/status', [CoupleGuestController::class, 'updateStatus']);
        Route::patch('/guests/{id}/group', [CoupleGuestController::class, 'moveToGroup']);
        Route::get('/guest-groups', [GuestGroupController::class, 'index']);
        Route::post('/guest-groups', [GuestGroupController::class, 'store']);
        Route::post('/guest-groups/table-codes', [GuestGroupController::class, 'createTableCodes']);
        Route::patch('/guest-groups/{id}', [GuestGroupController::class, 'update']);
        Route::post('/guest-groups/{id}/regenerate-code', [GuestGroupController::class, 'regenerateCode'])
            ->middleware('throttle:guest-code-regenerate');
        Route::prefix('payments')->group(function () {
            Route::post('/create-checkout', [PaymentController::class, 'createCheckout']);
            Route::get('/status', [PaymentController::class, 'status']);
            Route::get('/usage', [PaymentController::class, 'usage']);
            Route::get('/usage-analytics', [PaymentController::class, 'usageAnalytics']);
            Route::post('/verify-domain', [PaymentController::class, 'verifyDomain']);
            Route::post('/portal', [PaymentController::class, 'portal']);
            Route::post('/portal-session', [PaymentController::class, 'portalSession']);
            Route::get('/invoice-history', [PaymentController::class, 'invoiceHistory']);
        });
        Route::get('/admin/domain-status', [PaymentController::class, 'domainStatus']);
    });

    Route::middleware(['auth:sanctum', 'admin.only'])->group(function () {
        Route::get('/admin/overview', [AdminOverviewController::class, 'index']);
        Route::post('/admin/reminders/pending', [AdminReminderController::class, 'sendPending'])
            ->middleware('throttle:admin-reminder-bulk');
        Route::post('/admin/reminders/{guest_id}', [AdminReminderController::class, 'sendSingle']);
        Route::get('/admin/reminders/stats', [AdminReminderController::class, 'stats']);
        Route::get('/admin/guests', [AdminGuestController::class, 'index']);
        Route::delete('/admin/guests/{id}', [AdminGuestController::class, 'destroy']);
        Route::post('/admin/guests/bulk-invite', [AdminGuestController::class, 'bulkInvite'])
            ->middleware('check.guest.limit');
        Route::patch('/admin/guests/{id}/status', [AdminGuestController::class, 'updateStatus']);
        Route::get('/admin/analytics/invites', [AdminInviteAnalyticsController::class, 'invites']);
        Route::get('/admin/activity', [AdminActivityController::class, 'index']);
    });
});
