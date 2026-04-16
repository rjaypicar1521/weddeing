<?php

namespace App\Events;

use App\Models\Rsvp;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class GuestRsvpSubmitted
{
    use Dispatchable;
    use SerializesModels;

    public function __construct(public readonly Rsvp $rsvp)
    {
    }
}
