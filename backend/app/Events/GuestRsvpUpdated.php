<?php

namespace App\Events;

use App\Models\Rsvp;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class GuestRsvpUpdated
{
    use Dispatchable;
    use SerializesModels;

    /**
     * @param array<int, string> $changedFields
     */
    public function __construct(
        public readonly Rsvp $rsvp,
        public readonly array $changedFields,
    ) {
    }
}
