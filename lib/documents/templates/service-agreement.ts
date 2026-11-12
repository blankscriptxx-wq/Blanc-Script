/** Blanc Script — Service Agreement (full), transcribed from the studio's PDF. See lib/documents/MARKUP.md. */
export const SERVICE_AGREEMENT_FULL = String.raw`@doc full
@cover SERVICE / AGREEMENT | Content Services — Retainer & Project Work
@party client={{client_name}} | date={{start_date}} | reference={{project_name}}
@note This agreement is confidential between the parties named above.

@page
@contents
@callout teal | HOW THIS AGREEMENT WORKS :: Sections 2 to 4 are completed for each engagement and, once signed, form the commercial schedule. Sections 5 to 17 are the Studio’s standard terms and apply to every engagement unless varied in writing.

@page
@section 01 | SECTION | Definitions & interpretation
@intro The following terms carry the meanings set out below wherever they appear in this agreement.
@def Agreement :: this document together with the completed Sections 2 to 4 and any schedule, statement of work or written variation signed by both parties.
@def Studio :: Blanc Script, a creative content studio, and its personnel, contractors and subcontractors.
@def Client :: the party identified in Section 2.
@def Services :: the services selected in Section 3 and any further services agreed in writing.
@def Deliverables :: the final content items specified in Section 4, delivered in the agreed formats.
@def Materials :: all raw footage, photography, project files, session files, source assets and working documents created or used by the Studio in producing the Deliverables.
@def Retainer :: a recurring monthly engagement for an agreed monthly fee.
@def Project :: a defined piece of work with a fixed scope and fee, engaged outside a Retainer.
@def Fees :: the amounts payable by the Client under Section 5.
@def Business Day :: any day other than a Saturday, Sunday or public holiday in England.

@clause 1 | Interpretation
Headings are for convenience only and do not affect interpretation. Words importing the singular include the plural and vice versa. A reference to writing includes email. Any phrase introduced by “including”, “in particular” or similar is illustrative and does not limit the words preceding it.

Where Sections 2 to 4 conflict with Sections 5 to 17, Sections 2 to 4 prevail in respect of commercial scope only. In all other respects the standard terms prevail.

@page
@section 02 | SECTION | Client information
@intro To be completed by the Client. The details below identify the contracting party and the engagement.
@fields 2
@field COMPANY NAME :: {{client_name}}
@field CONTACT NAME :: {{contact_name}}
@field COMPANY NUMBER ::
@field PROJECT NAME :: {{project_name}}
@field REGISTERED ADDRESS :: | span=2
@field BILLING ADDRESS (IF DIFFERENT) :: | span=2
@field EMAIL :: {{contact_email}}
@field TELEPHONE :: {{contact_phone}}
@field CONTRACT START DATE :: {{start_date}}
@field ENGAGEMENT TYPE (RETAINER / PROJECT) :: {{engagement_type}}
@field MINIMUM TERM (MONTHS) ::
@field MONTHLY RETAINER / PROJECT FEE (EXCL. VAT) :: {{fee}}
@endfields
@callout red | ACCURACY OF INFORMATION :: The Client warrants that the information provided in this section is accurate and complete, and will notify the Studio in writing of any material change within ten Business Days.

@page
@section 03 | SECTION | Scope of services
@intro Tick each platform and service included in this engagement. Anything not selected is outside scope and will be quoted separately.
@checks 3 | PLATFORMS
[ ] Instagram
[ ] TikTok
[ ] Facebook
[ ] LinkedIn
[ ] YouTube
[ ] Website
@endchecks
@rule
@checks 3 | SERVICES
[ ] Content strategy
[ ] Planning
[ ] Creative direction
[ ] Scriptwriting
[ ] Filming
[ ] Photography
[ ] Editing
[ ] Motion graphics
[ ] Colour grading
[ ] Publishing
[ ] Community management
[ ] Paid advertising
[ ] Consultation
[ ] Talent / models
[ ] Location sourcing
@endchecks
@rule
@fields 2
@field ADDITIONAL SERVICES AGREED IN WRITING :: {{add_ons}} | span=2
@field EXCLUSIONS :: | span=2
@endfields
@callout amber | SCOPE CHANGES :: Any work falling outside the selected scope constitutes a variation. The Studio will provide a written estimate before commencing, and no variation is binding until confirmed in writing by both parties.

@page
@section 04 | SECTION | Deliverables & schedule
@intro The agreed monthly output. Volumes are measured across each calendar month of the engagement.
@table DELIVERABLE | AGREED VALUE
Short-form videos per month (e.g. 12–16) ::
Long-form videos per month ::
Photographs per month ::
Shoot days per month ::
Premium cinematic productions (per month / every two months) ::
Posting frequency (per platform, per week) ::
Campaign work (included / quoted separately) ::
Reporting (monthly performance summary) ::
@endtable
@fields 2
@field DELIVERY FORMAT & SPECIFICATION :: | span=2
@endfields
@callout teal | DELIVERY WINDOWS :: Unless otherwise agreed, Deliverables are supplied within ten Business Days of the relevant shoot day. Timeframes assume the Client meets its obligations under Section 6; delay by the Client extends delivery dates by an equivalent period.

@page
@section 05 | SECTION | Fees, invoicing & payment
@clause 2 | Retainer fees
Retainer Fees are payable monthly in advance. The Studio will invoice on or around the same day of each month, and payment falls due on the invoice date unless a different period is stated on the invoice.

The first monthly instalment is payable before the Studio commences work.

@clause 3 | Project fees
For Project work, a deposit of fifty per cent (50%) of the total Fee is payable before pre-production begins. The remaining balance is payable prior to release of the final Deliverables.

The Studio is under no obligation to release final Deliverables, in any format, until the balance has been received in cleared funds.

@clause 4 | VAT and expenses
All Fees are stated exclusive of VAT, which is payable in addition at the prevailing rate where applicable.

Pre-agreed third-party costs — including location hire, talent fees, travel beyond a fifty-mile radius of the Studio’s base, licensed music and equipment hire — are recharged at cost and invoiced alongside the relevant month.

@clause 5 | Late payment
Where any sum is not paid when due, the Studio may charge statutory interest and compensation under the Late Payment of Commercial Debts (Interest) Act 1998, together with reasonable costs of recovery.

The Studio may suspend performance of the Services, in whole or in part, where payment remains outstanding for more than seven days after the due date. Suspension does not relieve the Client of the obligation to pay Fees falling due during the period of suspension, and the Studio bears no liability for any consequence of a suspension properly exercised under this clause.

@clause 6 | No set-off
All sums payable under this Agreement are payable in full without deduction, withholding, counterclaim or set-off, except as required by law.

@page
@section 06 | SECTION | Client responsibilities
@clause 7 | The Client shall
a) provide safe and timely access to premises, vehicles, locations and equipment reasonably required for the Services, and obtain any permission, licence or permit necessary for filming at those locations;
b) ensure that personnel, talent and any third parties appearing in the content are available at agreed times and have consented to being filmed or photographed;
c) provide accurate, complete and lawful information, brand assets and instructions, and hold all rights necessary to supply them;
d) nominate a single individual with authority to approve concepts, scripts and Deliverables on the Client’s behalf;
e) respond to requests for approval, feedback or information within five Business Days; and
f) comply with all applicable laws, platform terms and advertising codes in respect of content published on the Client’s channels.
@callout red | WHERE THE CLIENT CAUSES DELAY :: If the Client fails to meet an obligation in this Section and that failure prevents or delays the Studio, the Studio is not liable for the resulting delay, may adjust delivery dates accordingly, and may recover reasonable additional costs properly incurred.

@section 07 | SECTION | Studio responsibilities
@clause 8 | The Studio shall
a) perform the Services with the reasonable skill and care to be expected of a competent creative content studio;
b) deliver the agreed Deliverables within the agreed timeframes, subject to the Client meeting its obligations;
c) communicate timelines, shoot schedules and any material change to them in good time;
d) ensure its personnel and subcontractors are appropriately supervised and bound by equivalent confidentiality obligations;
e) maintain appropriate insurance for the conduct of its business; and
f) maintain confidentiality in accordance with Section 10.

@page
@section 08 | SECTION | Approvals & revisions
@intro A clear revision process protects both quality and timelines.
@clause 9 | Included revisions
Each Deliverable includes two (2) rounds of revisions. A round comprises a single consolidated set of amendments submitted by the Client’s nominated approver.

@clause 10 | Revision window
Revision requests must be submitted in writing within seven (7) days of delivery. Where no request is received within that period, the Deliverable is deemed approved and accepted.

@clause 11 | Additional revisions
Revisions beyond the two included rounds, and any amendment that materially changes an approved concept, script or edit, are chargeable at the Studio’s prevailing hourly rate, notified to the Client before the work is undertaken.

@clause 12 | Reshoots
Where a revision cannot be achieved in post-production and requires additional filming, that reshoot constitutes a variation to scope and is quoted separately before it is undertaken.

@steps THE APPROVAL PATH :: Delivery | Review 7 days | Round 1 | Round 2 | Approved
@callout amber | DEEMED APPROVAL :: Silence is treated as acceptance. Where the Client does not respond within the revision window, the Studio may publish or release the Deliverable and the corresponding Fee becomes payable.

@page
@section 09 | SECTION | Intellectual property
@intro Ownership passes on payment. Raw Materials remain with the Studio unless bought out.
@clause 13 | Retention of title
All intellectual property rights in the Deliverables and Materials vest in and remain with the Studio until the Studio has received payment in full and in cleared funds of all Fees due under this Agreement.

@clause 14 | Licence on payment
Upon payment in full, the Studio grants the Client a perpetual, worldwide, non-exclusive, royalty-free licence to use, reproduce, publish and display the final Deliverables for the Client’s own business and marketing purposes, including paid advertising.

The licence does not permit the Client to resell, sublicense or distribute the Deliverables as standalone assets, nor to alter them in a way that materially changes their meaning, without the Studio’s prior written consent.

@clause 15 | Raw Materials
Raw footage, project files, session files and other Materials are not Deliverables and remain the sole property of the Studio. They may be purchased under a separate written buy-out on terms to be agreed.

@clause 16 | Third-party assets
Music, stock, fonts and other licensed assets are supplied under the terms of the applicable third-party licence, which is passed through to the Client only to the extent that licence permits. The Client is responsible for any renewal or extension of such licences.

@clause 17 | Portfolio rights
The Studio may use the Deliverables, and reasonable behind-the-scenes material, in its portfolio, website, showreel, social channels, awards submissions and new-business materials, and may identify the Client as a client, unless the Client notifies the Studio otherwise in writing before the relevant work commences.

@clause 18 | Moral rights
The Studio asserts its moral rights where they arise. The Client is under no obligation to credit the Studio, but the Studio may request a credit where content is used in a public campaign.

@page
@section 10 | SECTION | Confidentiality
@clause 19 | Mutual obligation
Each party shall keep confidential all information of a confidential nature disclosed by the other, whether marked confidential or which a reasonable person would treat as confidential, including commercial terms, strategy documents, pricing, unpublished content, customer data and business plans.

@clause 20 | Permitted disclosure
A party may disclose confidential information to its personnel, professional advisers and subcontractors who need to know it, provided they are bound by equivalent obligations, and where disclosure is required by law, court order or a regulatory authority.

@clause 21 | Exclusions and duration
These obligations do not apply to information that is or becomes public other than through breach of this Agreement, was lawfully known before disclosure, or is independently developed without reference to the disclosing party’s information. They survive termination for three (3) years.

@clause 22 | Return of information
On termination, each party shall, at the other’s written request, return or securely destroy the other’s confidential information, save for one copy retained for legal or regulatory record-keeping and for material held in routine backup systems.

@callout teal | UNPUBLISHED WORK IS CONFIDENTIAL :: Concepts, scripts, edits and strategy documents shared before publication are confidential and must not be circulated outside the Client’s organisation without the Studio’s written consent.

@page
@section 11 | SECTION | Data protection
@clause 23 | Compliance
Each party shall comply with the UK General Data Protection Regulation and the Data Protection Act 2018 in respect of any personal data processed under this Agreement.

@clause 24 | Roles
The parties are independent controllers in respect of their own business contact data. Where the Studio processes personal data on the Client’s behalf — for example in managing the Client’s social accounts or handling customer enquiries — the Studio acts as processor and shall process such data only on the Client’s documented instructions, apply appropriate technical and organisational measures, and assist the Client with data subject requests so far as reasonably practicable.

@clause 25 | Filming and consent
Where individuals are filmed or photographed, the Client is responsible for ensuring an appropriate lawful basis exists and that any necessary consents or release forms have been obtained before filming begins. The Studio will supply standard release forms on request.

@clause 26 | Breach notification
Each party shall notify the other without undue delay, and in any event within forty-eight (48) hours, of becoming aware of a personal data breach affecting data processed under this Agreement.

@clause 27 | Sub-processors
The Studio may appoint sub-processors — including editing, scheduling and cloud storage providers — provided each is bound by data protection obligations no less protective than those in this Section. A list of current sub-processors is available on request.

@callout red | RELEASE FORMS :: Where members of the public, staff or talent appear on camera, a signed release is required before filming. The Studio supplies standard forms; obtaining the signatures is the Client’s responsibility.

@page
@section 12 | SECTION | Term, cancellation & termination
@clause 28 | Term
This Agreement begins on the contract start date stated in Section 2 and continues for the minimum term stated there. After the minimum term it continues on a rolling monthly basis until terminated in accordance with this Section.

@clause 29 | Termination of a Retainer
After the minimum term, either party may terminate a Retainer by giving thirty (30) days’ written notice, expiring at the end of a calendar month. Fees remain payable for the whole of the notice period, and the Studio will continue to deliver the Services during it.

A Retainer may not be terminated for convenience during the minimum term. Where the Client purports to do so, the balance of Fees for the remainder of the minimum term becomes immediately due.

@clause 30 | Cancellation of a Project
Deposits are non-refundable once pre-production has commenced. Where the Client cancels a Project after pre-production has begun, the Client remains liable for all work performed to the date of cancellation and all committed third-party costs.

@clause 31 | Rescheduling
A shoot day may be rescheduled once without charge on not less than five (5) Business Days’ notice, subject to the Studio’s availability. Cancellation or rescheduling within five Business Days of a shoot day may incur a charge of up to fifty per cent (50%) of that day’s production cost, together with any irrecoverable third-party costs.

@clause 32 | Termination for cause
Either party may terminate this Agreement immediately by written notice where the other commits a material breach that is incapable of remedy, or which is capable of remedy and is not remedied within fourteen (14) days of written notice requiring it to be remedied; or where the other becomes insolvent, enters administration or ceases to carry on business.

@clause 33 | Consequences of termination
On termination, all invoices issued remain payable and the Studio shall invoice for work performed but not yet invoiced. Sections 9, 10, 11, 15 and 17 survive termination. Deliverables paid for in full remain licensed to the Client; Deliverables not paid for may not be used.

@page
@section 13 | SECTION | Force majeure
@clause 34 | Events beyond reasonable control
Neither party is liable for any failure or delay in performing its obligations where that failure or delay results from an event beyond its reasonable control, including adverse weather preventing safe or usable filming, illness or injury of key personnel or talent, government restriction or public health measure, failure or theft of equipment, travel disruption, power or network failure, fire, flood, civil unrest or industrial action.

The affected party shall notify the other promptly and use reasonable endeavours to mitigate. Shoot days lost to such an event will be rescheduled to the next mutually convenient date at no additional production fee. Where the event continues for more than sixty (60) consecutive days, either party may terminate on written notice without further liability, save for sums already due.

@section 14 | SECTION | Performance & platform disclaimer
@clause 35 | No guarantee of results
The Studio provides creative and production services. It does not guarantee, and the Client does not rely on any representation as to, any particular level of follower growth, reach, impressions, engagement, enquiries, leads, conversions or sales.

@clause 36 | Matters outside the Studio’s control
Social media platforms operate proprietary algorithms and may without notice change their functionality, ranking, distribution or advertising policies, restrict or suspend accounts, or remove content. The Studio bears no liability for any such change, restriction, suspension or removal, nor for the acts or omissions of any platform.

@callout teal | WHAT THE STUDIO DOES COMMIT TO :: Consistent, high-quality output delivered on schedule; strategic decisions grounded in performance data; and honest reporting of what is working and what is not.

@page
@section 15 | SECTION | Limitation of liability
@clause 37 | Liability not excluded
Nothing in this Agreement limits or excludes either party’s liability for death or personal injury caused by negligence, for fraud or fraudulent misrepresentation, or for any other liability that cannot lawfully be limited or excluded.

@clause 38 | Excluded losses
Subject to clause 37, neither party is liable to the other, whether in contract, tort (including negligence), breach of statutory duty or otherwise, for any loss of profit, loss of revenue, loss of anticipated savings, loss of business or business opportunity, loss of goodwill or reputation, or any indirect or consequential loss.

@clause 39 | Financial cap
Subject to clause 37, the Studio’s total aggregate liability arising out of or in connection with this Agreement shall not exceed the total Fees paid by the Client to the Studio in the twelve (12) months immediately preceding the event giving rise to the claim, or in the case of a Project, the total Fee payable for that Project.

@clause 40 | Client-supplied material
The Client indemnifies the Studio against any claim arising from material supplied by the Client, from a lack of consent or permission that the Client was responsible for obtaining, or from the Client’s publication or use of Deliverables in breach of this Agreement or applicable law.

@clause 41 | Time limit
No claim may be brought under this Agreement more than twelve (12) months after the date on which the claiming party became aware, or ought reasonably to have become aware, of the circumstances giving rise to it.

@section 16 | SECTION | General provisions
@clause 42 | Entire agreement
This Agreement constitutes the entire agreement between the parties and supersedes all prior discussions, proposals and representations. Nothing in this clause limits liability for fraudulent misrepresentation.

@page
@clause 43 | Variation and waiver
No variation is effective unless in writing and signed by both parties. A failure or delay in exercising a right is not a waiver of it.

@clause 44 | Assignment and subcontracting
Neither party may assign this Agreement without the other’s written consent, such consent not to be unreasonably withheld. The Studio may subcontract elements of the Services and remains responsible for its subcontractors’ performance.

@clause 45 | Non-solicitation
During the term and for six (6) months afterwards, the Client shall not, without the Studio’s written consent, directly engage any individual introduced by the Studio who was materially involved in the delivery of the Services.

@clause 46 | Third parties and severance
No third party may enforce this Agreement under the Contracts (Rights of Third Parties) Act 1999. If any provision is held invalid or unenforceable, the remainder continues in full force and the offending provision is modified only to the minimum extent necessary.

@clause 47 | Notices
Notices must be given in writing to the addresses stated in Section 2 or by email to the addresses given there, and are deemed received on the next Business Day.

@section 17 | SECTION | Governing law & jurisdiction
@clause 48 | Law and forum
This Agreement and any dispute or claim arising out of or in connection with it, including non-contractual disputes, is governed by and construed in accordance with the law of England and Wales. The parties submit to the exclusive jurisdiction of the courts of England and Wales.

@clause 49 | Resolving disputes
Before commencing proceedings, the parties shall meet in good faith, in person or by video, within fourteen (14) days of a written request to attempt to resolve the dispute. This clause does not prevent either party from seeking urgent injunctive relief.

@page
@section — | SECTION | Execution
@intro By signing below, each party confirms it has read and agrees to be bound by this Agreement, including the standard terms in Sections 5 to 17.
@summary AGREEMENT SUMMARY
@field ENGAGEMENT TYPE :: {{engagement_type}}
@field MINIMUM TERM ::
@field MONTHLY FEE (EXCL. VAT) :: {{fee}}
@endsummary
@signatures
@rule
@note This Agreement may be executed in counterparts and by electronic signature, each of which is an original and together constitute one instrument.

@page
@backcover Service Agreement | Governed by the law of England and Wales
`;
