# Blanc Script document markup ("BSD")

Designed documents (the Service Agreement and its Short Form) are stored as
plain text in `document_templates.body`, so staff can still edit the wording.
A body whose first line starts with `@doc` is rendered by
`components/documents/rich-document.tsx` as A4 pages that match the studio's
PDF design. Any other body is plain text (the older, simple renderer).

Rules: one directive per line. A directive starts with `@` at the start of the
line. `|` separates arguments, `::` separates a label from its value. Merge
fields look like `{{client_name}}` and are filled in before rendering. Leading
and trailing spaces are ignored. Blank lines separate paragraphs.

## Document level

    @doc full                     first line. Variant: `full` or `short`.
                                  full  → footer "Content Services Agreement · Confidential", page numbers "03"
                                  short → footer "Confidential", page numbers "2 / 3"
    @cover SERVICE / AGREEMENT | Content services — retainer & project work
                                  cover page. `/` splits the title into lines. Subtitle (Lora italic) is optional.
    @party client={{client_name}} | date={{start_date}} | reference={{project_name}}
                                  the "Between Blanc Script and <client>" box on the cover, with the
                                  agreement date and reference lines. Must follow @cover.
    @contents                     a contents page built from every @section in the document.
    @page                         start a new page.
    @backcover Service Agreement | Governed by the law of England and Wales
                                  dark closing page with the light logo.

## Sections and text

    @section 01 | SECTION | Definitions & interpretation
                                  red number, grey spaced eyebrow, big bold title with the teal squiggle
                                  under it. Use `—` as the number for an unnumbered section (Execution).
                                  Does NOT start a new page by itself; use @page.
    @intro Text                   the italic (Lora) sentence under a section title.
    @def Term :: meaning          one row of a definitions list (bold term left, meaning right).
    @clause 1 | Interpretation    numbered clause: teal number, bold heading. The paragraphs and lists
                                  that follow (until the next directive that is not text) are indented under it.
    Plain line                    a paragraph.
    a) text                       lettered sub-item (red letter). Consecutive lines form one list.
    - text                        bullet (teal dot). Consecutive lines form one list.
    @sub Heading                  small bold heading with a short red underline (short form terms).
    @note Text                    small grey text.
    @rule                         thin horizontal rule.

## Forms

    @fields 2                     start a grid of form fields with 2 (or 3) columns.
    @field COMPANY NAME :: {{client_name}}
    @field REGISTERED ADDRESS ::  | span=2
    @field PLATFORMS :: | hint=Instagram / TikTok / YouTube
    @endfields
                                  each field is a small spaced uppercase label above a line. The value
                                  sits on the line; an empty value (or an unfilled `[merge field]`) leaves
                                  the line blank. `hint=` shows pale placeholder text when there is no value.
                                  `span=2` / `span=3` makes the field wider.

    @checks 3 | PLATFORMS         a labelled grid of tick boxes, 3 columns.
    [ ] Instagram
    [x] TikTok
    @endchecks

    @table DELIVERABLE | AGREED VALUE
    Short-form videos per month (e.g. 12–16) :: 
    Long-form videos per month :: 2
    @endtable
                                  dark header row, then rows: teal dot, bold-ish name, optional grey hint
                                  in brackets, and the value on a line at the right.

    @summary AGREEMENT SUMMARY    a light rounded box of fields (used on the Execution page).
    @field ENGAGEMENT TYPE :: {{engagement_type}}
    @endsummary

    @paybox PAYMENT DETAILS | Blanc Script
    @field SORT CODE :: 
    @endpaybox
                                  dark rounded box with an amber left edge, amber label, white name, then fields.

## Callouts and diagrams

    @callout amber | SCOPE CHANGES :: Any work falling outside the selected scope…
                                  dark rounded box, coloured left edge and label. Colour: amber, teal or red.
    @steps THE APPROVAL PATH :: Delivery | Review 7 days | Round 1 | Round 2 | Approved
                                  numbered circles (01…05) joined by a line, cycling teal, amber, teal, amber, red.

## Layout

    @cols                         start a two-column block.
    @col                          start the second column.
    @endcols

## Signing

    @signatures                   "For the Client" / "For Blanc Script" blocks: signature, printed name,
                                  position, date. When the client has accepted in the portal the renderer
                                  fills the client side with their typed name and the date.
    @signatures short             short-form version: signature, then printed name and date side by side.
