/** Blanc Script — Service Agreement (short form), transcribed from the studio's PDF. See lib/documents/MARKUP.md. */
export const SERVICE_AGREEMENT_SHORT = String.raw`@doc short

@page
@cover SERVICE / AGREEMENT | Content services — retainer & project work
@party client={{client_name}} | date={{start_date}} | reference={{project_name}}
@note This agreement is confidential between the parties named above.

@page
@section 01 | THE ENGAGEMENT | Client information
@fields 2
@field COMPANY NAME :: {{client_name}}
@field CONTACT NAME :: {{contact_name}}
@field COMPANY NUMBER ::
@field TELEPHONE :: {{contact_phone}}
@field EMAIL :: {{contact_email}}
@field PROJECT NAME :: {{project_name}}
@field REGISTERED ADDRESS :: | span=2
@field BILLING ADDRESS (IF DIFFERENT) :: | span=2
@endfields

@section | | Scope of service
@fields 3
@field PLATFORMS :: | hint=Instagram / TikTok / YouTube
@field CONTENT PER MONTH :: | hint=12–16 videos
@field CONTENT TYPE :: | hint=Cinematic / native
@field SERVICES INCLUDED :: | span=3 | hint=Strategy · Scripting · Filming · Editing · Grading · Publishing
@field SHOOT DAYS :: | hint=2 per month
@field PREMIUM PRODUCTION :: | hint=Monthly / bi-monthly
@field EXCLUSIONS ::
@endfields

@section | | Fees & payment
@fields 3
@field MONTHLY RETAINER (EXCL. VAT) :: {{fee}} | hint=£
@field MINIMUM TERM :: | hint=months
@field START DATE :: {{start_date}}
@endfields

@paybox PAYMENT DETAILS | Blanc Script
@field SORT CODE ::
@field ACCOUNT NUMBER ::
@field PAYMENT REFERENCE ::
@endpaybox
@note Payment by bank transfer (BACS) or standing order. Retainers payable monthly in advance. All fees exclusive of VAT.

@page
@section 02 | TERMS OF AGREEMENT | Terms
@cols
@sub Client responsibilities
- Have staff, site and materials ready before the crew arrives.
- Provide suitable filming conditions and access to facilities.
- Obtain any permission or consent needed to film on location or on camera.
- Approve content and respond to requests within 5 working days.
- Insufficient preparation may incur additional fees or rescheduling.
@sub Retainers
- Payable monthly in advance; first payment before work begins.
- First month includes a one-off setup fee equal to one additional week, covering the initial shoot and edit.
- Minimum term as stated on page 2. Thereafter either party may cancel on 30 days’ written notice.
- Outstanding invoices remain payable on cancellation.
@sub Late payment
- Work may be paused if payment is more than 7 days overdue.
- Interest may be charged under the Late Payment of Commercial Debts (Interest) Act 1998.
@sub Results & confidentiality
- The Studio cannot guarantee follower growth, enquiries or sales.
- Platform algorithm changes are outside the Studio’s control.
- Both parties keep each other’s confidential information private.
@col
@sub Project & event work
- 50% non-refundable deposit secures the shoot date.
- Balance due before final deliverables are released.
- Client cancellation: deposit non-refundable once pre-production begins.
- Studio cancellation: deposit refunded in full.
- Rescheduling permitted once at no charge, subject to availability.
@sub Delivery & revisions
- Shoot scheduled within 7 days of signing and first payment.
- Edited content delivered within 7–14 days of the shoot.
- Two rounds of revisions included per deliverable.
- Revisions must be requested within 7 days; after that content is treated as approved.
- Further revisions charged at the Studio’s hourly rate.
@sub Ownership & use
- The Studio owns the content until invoices are paid in full.
- On payment, the Client is licensed to use the final content for its own business.
- Raw footage and project files remain the Studio’s unless bought separately.
- The Studio may show completed work in its portfolio unless agreed otherwise in writing.
@endcols

@callout teal | GOVERNING LAW :: This agreement is governed by the law of England and Wales and subject to its exclusive jurisdiction.

By signing below, you confirm you have read, understood and agree to the terms set out in this agreement.

@signatures short
`;
