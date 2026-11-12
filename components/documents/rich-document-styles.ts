/**
 * The look of the designed documents (Service Agreement and its Short Form),
 * measured from the studio's PDFs. Everything is scoped under `.bsd`.
 *
 * Sizes are written in PDF points with a `u` suffix (`12u`) and turned into
 * `calc(var(--u) * 12)` below. `--u` is one point of an A4 page that is as wide
 * as the sheet, so a sheet keeps exactly the PDF's proportions at any width —
 * on a phone, on a desktop and in print.
 */
const SOURCE = `
.bsd{--cream:#F7EDE2;--card:#FDF7F0;--ink:#26272E;--ink2:#3A3B45;--red:#EE3A5F;--teal:#2AA6A8;--amber:#E8A33D;--grey:#8A8A90;--hair:#E2D5C6;--tan:#C9B9A6;--pale:#BCAE9E;--paper:#F3E9DD;
  --sans:var(--bsd-sans,'Poppins'),system-ui,sans-serif;--serif:var(--bsd-serif,'Lora'),Georgia,serif;
  --u:1.3333px;--mx:56u;--mxr:56.65u;
  display:block;width:100%;font-family:var(--sans);color:var(--ink2);-webkit-font-smoothing:antialiased;-webkit-text-size-adjust:100%;text-size-adjust:100%;font-kerning:none;font-variant-ligatures:none;font-synthesis:none;text-rendering:geometricPrecision}
@supports (width:1cqw){.bsd{--u:calc(100cqw / 595.276)}}
.bsd--short{--mx:52u;--mxr:52.65u}
.bsd *,.bsd *::before,.bsd *::after{box-sizing:border-box}
:where(.bsd) :where(h2,h3,p,ul,ol,li,dl,dt,dd,table,th,td){margin:0;padding:0;font:inherit;color:inherit;border:0}
:where(.bsd) :where(ul,ol){list-style:none}
:where(.bsd) img{display:block;max-width:none;border:0}

/* ---- the sheet ---- */
.bsd-sheet{container-type:inline-size;position:relative;width:100%;max-width:794px;margin:0 auto 18px;aspect-ratio:595.276 / 841.89;background:var(--cream);box-shadow:0 1px 2px rgba(38,39,46,.08),0 14px 36px -18px rgba(38,39,46,.35);display:flex;flex-direction:column;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.bsd-sheet:last-child{margin-bottom:0}
.bsd-sheet--dark{background:var(--ink)}
.bsd-page{flex:1 1 auto;display:flex;flex-direction:column;font-size:9.4u;line-height:15.33u;font-weight:300}

/* ---- running header and footer ---- */
.bsd-head{position:relative;flex:none;height:60.4u}
.bsd-head::after{content:'';position:absolute;left:var(--mx);right:var(--mxr);bottom:-.35u;border-top:.7u solid var(--hair)}
.bsd-head img{position:absolute;left:var(--mx);top:35.4u;width:30.8u;height:auto}
.bsd-head span{position:absolute;right:var(--mxr);top:38u;font-size:7.67u;line-height:1.4;font-weight:500;letter-spacing:.31em;margin-right:-.31em;color:var(--grey);text-transform:uppercase;white-space:nowrap}
.bsd--short .bsd-head{height:56.4u}
.bsd--short .bsd-head img{top:32.4u;width:29u}
.bsd--short .bsd-head span{top:34.4u;font-size:7.33u;letter-spacing:.33em;margin-right:-.33em}
.bsd-foot{position:relative;flex:none;height:52.5u;padding:6.3u var(--mxr) 0 var(--mx);display:grid;grid-template-columns:1fr auto 1fr;align-items:start;color:var(--grey);white-space:nowrap}
.bsd-foot::before{content:'';position:absolute;left:var(--mx);right:var(--mxr);top:-.35u;border-top:.7u solid var(--hair)}
.bsd-foot-l{font-size:6.67u;line-height:1.4;font-weight:500;letter-spacing:.3em;text-transform:uppercase}
.bsd-foot-c{font-size:7u;line-height:1.4;font-weight:300;text-align:center;letter-spacing:.044em;margin-top:-1u}
.bsd-foot-r{font-size:7.67u;line-height:1.4;font-weight:500;letter-spacing:.14em;margin-right:-.14em;text-align:right;margin-top:-.8u}
.bsd--short .bsd-foot{height:48.5u;padding-top:5.3u}
.bsd--short .bsd-foot-c{font-size:6.9u;letter-spacing:.04em;margin-top:0}
.bsd--short .bsd-foot-r{font-size:7.33u;margin-top:-.1u;letter-spacing:.105em;margin-right:-.105em}
.bsd-body{flex:1 1 auto;display:flex;flex-direction:column;padding:25.6u var(--mxr) 0 var(--mx)}
.bsd--short .bsd-body{padding-top:28.3u}
.bsd-body>*{flex:none}

/* ---- section header ---- */
.bsd-section{position:relative;margin-top:14.2u}
.bsd-callout+.bsd-section{margin-top:10.2u}
.bsd-body>.bsd-section:first-child,.bsd-col>.bsd-section:first-child{margin-top:0}
.bsd-eyebrow{display:flex;align-items:baseline;height:13.5u;line-height:13.5u;white-space:nowrap}
.bsd-eyebrow-num{font-size:9.67u;font-weight:700;color:var(--red);letter-spacing:.12em}
.bsd-eyebrow-text{font-size:8.67u;font-weight:500;color:var(--grey);letter-spacing:.33em;text-transform:uppercase;margin-left:9.6u;transform:translateY(-.6u)}
.bsd-section h2{margin-top:6.5u;font-size:23u;line-height:32.2u;font-weight:700;color:var(--ink);letter-spacing:.0125em}
.bsd-title{position:relative;display:inline-block;z-index:0}
.bsd-title-text{position:relative;z-index:1}
.bsd-squiggle{position:absolute;left:2u;top:calc(100% + 2.8u);width:50%;max-width:130u;min-width:44u;height:auto;transform:translateY(-50%);z-index:0;pointer-events:none}
.bsd--short .bsd-eyebrow{height:12.6u;line-height:12.6u}
.bsd--short .bsd-eyebrow-num{font-size:9u}
.bsd--short .bsd-eyebrow-text{font-size:8u;margin-left:8.5u;letter-spacing:.35em;transform:none}
.bsd--short .bsd-section h2{margin-top:7u;font-size:20u;line-height:28u;letter-spacing:.0145em}
.bsd--short .bsd-section:has(+.bsd-cols){padding-top:6u}
.bsd--short .bsd-section:has(+.bsd-cols) h2{margin-top:5.3u}
.bsd--short .bsd-squiggle{left:1u;top:calc(100% - .3u);width:70u;max-width:none}
.bsd-section--secondary{margin-top:44.5u;border-top:.7u solid var(--hair)}
.bsd .bsd-section--secondary h2{margin-top:.6u}
.bsd-body>.bsd-section--secondary:first-child{margin-top:0;border-top:0}
.bsd-intro{margin-top:9.8u;font-family:var(--serif);font-style:italic;font-weight:400;font-size:10.67u;line-height:16u;color:var(--ink2);max-width:441u;letter-spacing:-.007em}

/* ---- running text ---- */
.bsd-p{margin-top:5u;font-weight:300;color:var(--ink2)}
.bsd-body>.bsd-p,.bsd-col>.bsd-p{margin-top:12u}
.bsd--short .bsd-p{font-size:8.43u;line-height:1.4}
.bsd--short .bsd-callout+.bsd-p{margin-top:4u}
.bsd-clause{margin-top:13.1u;padding:0 4.05u 0 26u;position:relative}
.bsd-section+.bsd-clause{margin-top:22.7u}
.bsd-intro+.bsd-clause{margin-top:16.9u}
.bsd-body>.bsd-clause:first-child{margin-top:-1u}
.bsd-clause h3{font-size:10.5u;line-height:14.94u;font-weight:700;color:var(--ink);letter-spacing:.053em}
.bsd-clause-num{position:absolute;left:0;top:0;color:var(--teal);letter-spacing:0}
.bsd-clause h3+.bsd-p{margin-top:3.27u}
.bsd-clause h3+.bsd-list{margin-top:3.4u}
.bsd-list{margin-top:5u}
.bsd-list li{position:relative;padding:0 8.05u 0 22u;font-weight:300}
.bsd-list li+li{margin-top:4.35u}
.bsd-list-mark{position:absolute;left:0;top:0;font-size:9u;font-weight:500;color:var(--red)}
.bsd-bullets li{padding-left:14u}
.bsd-bullets li::before{content:'';position:absolute;left:.4u;top:calc(.5lh - 2u);width:4u;height:4u;border-radius:50%;background:var(--teal)}
.bsd-body>.bsd-list,.bsd-col>.bsd-list{margin-top:10u}
.bsd--short .bsd-list{font-size:8u;line-height:11.33u}
.bsd--short .bsd-list li+li{margin-top:4.33u}
.bsd--short .bsd-bullets li{padding-left:12u;padding-right:3u}
.bsd-sub{position:relative;margin-top:7.3u;padding-bottom:3.5u;font-size:8.67u;line-height:1.4;font-weight:700;color:var(--ink);letter-spacing:.066em}
.bsd-sub::after{content:'';position:absolute;left:0;bottom:0;width:14u;height:1.6u;background:var(--red)}
.bsd-sub+.bsd-list{margin-top:5.3u}
.bsd-col>.bsd-sub:first-child{margin-top:0}
.bsd-note{margin-top:10u;font-size:8u;line-height:1.4;font-weight:300;color:var(--grey)}
.bsd-rule{margin-top:12.85u;border-top:.7u solid var(--hair);height:0}

/* ---- definitions ---- */
.bsd-defs{margin-top:17.1u;font-size:9.33u;line-height:14.67u}
.bsd-def{display:grid;grid-template-columns:118u 1fr;align-items:start;min-height:24u;padding-bottom:7.9u}
.bsd-def dt{font-weight:500;color:var(--ink);padding-right:8u;letter-spacing:.035em}
.bsd-def dd{max-width:357u;font-size:9.2u;font-weight:300;color:var(--ink2)}
.bsd-defs+.bsd-clause{margin-top:3.9u}

/* ---- form fields ---- */
.bsd-fields{margin-top:13.9u;display:grid;grid-template-columns:repeat(var(--cols,2),minmax(0,1fr));column-gap:26.7u;row-gap:32u;align-items:end}
.bsd-rule+.bsd-fields{margin-top:6.7u}
.bsd-fields--stack{row-gap:26u}
.bsd-table+.bsd-fields{margin-top:9.9u}
.bsd-field{min-width:0}
.bsd-field-label{font-size:6.67u;line-height:1.4;font-weight:500;letter-spacing:.266em;color:var(--grey);text-transform:uppercase;white-space:nowrap}
.bsd-field-value{min-height:10.67u;padding:1.2u 1u 1.6u;border-bottom:.8u solid var(--tan);font-size:9.33u;line-height:12.4u;font-weight:400;color:var(--ink);overflow-wrap:anywhere}
.bsd-field-value:empty{padding:0}
.bsd-field-value.is-hint{font-weight:300;color:var(--pale)}
.bsd--short .bsd-fields{column-gap:28u;row-gap:21.14u}
.bsd--short .bsd-fields[data-cols="3"]{column-gap:16u;row-gap:23.14u}
.bsd--short .bsd-section+.bsd-fields{margin-top:4.3u}
.bsd--short .bsd-section--secondary+.bsd-fields{margin-top:2.3u}
.bsd--short .bsd-field-label{font-size:6.33u;letter-spacing:.277em}
.bsd--short .bsd-field-value{min-height:11.54u;margin-top:-1.55u;padding:0 2u 0;font-size:7.67u;line-height:1.4;font-weight:400}
.bsd--short .bsd-field-value.is-hint{font-weight:300}

/* ---- tick boxes ---- */
.bsd-checks{margin-top:19.9u}
.bsd-rule+.bsd-checks{margin-top:13.9u}
.bsd-checks-label{font-size:7.67u;line-height:1.4;font-weight:500;letter-spacing:.34em;color:var(--grey);text-transform:uppercase}
.bsd-checks ul{margin-top:9.2u;display:grid;grid-template-columns:repeat(var(--cols,3),minmax(0,1fr))}
.bsd-checks-label:empty+ul{margin-top:0}
.bsd-checks li{display:flex;align-items:center;min-height:24u;padding-right:6u;font-size:8.75u;line-height:12.2u;font-weight:400;color:var(--ink2)}
.bsd-box{position:relative;flex:none;width:8.5u;height:8.5u;margin-right:7.3u;border:.9u solid var(--tan);border-radius:1u}
.bsd-box.is-on{background:var(--teal);border-color:var(--teal)}
.bsd-box.is-on::after{content:'';position:absolute;left:2.25u;top:.35u;width:2.5u;height:5u;border:solid #fff;border-width:0 1.2u 1.2u 0;transform:rotate(45deg)}

/* ---- table ---- */
.bsd-table{margin-top:4.1u;width:100%;border-collapse:separate;border-spacing:0;table-layout:fixed}
.bsd-table th{height:27.9u;background:var(--ink);color:var(--paper);font-size:7.67u;line-height:1.4;font-weight:500;letter-spacing:.29em;text-transform:uppercase;text-align:left;vertical-align:middle;padding:4.4u 0 0 16.1u;white-space:nowrap}
.bsd-table th:first-child{border-radius:5u 0 0 5u}
.bsd-table th:last-child{border-radius:0 5u 5u 0;text-align:right;padding:4.4u calc(15.3u - .29em) 0 0;width:145u}
.bsd-table th:only-child{border-radius:5u}
.bsd-table td{height:32u;vertical-align:middle;border-bottom:.6u solid var(--hair);padding:0}
.bsd-table tbody tr:nth-child(odd) td{background:var(--card)}
.bsd-table-name{position:relative;display:block;padding-left:28.1u;font-size:9.33u;line-height:14u;font-weight:500;color:var(--ink);letter-spacing:.03em;top:1u}
.bsd-table-name::before{content:'';position:absolute;left:11.8u;top:calc(50% - 2.2u);width:4.4u;height:4.4u;border-radius:50%;background:var(--teal)}
.bsd-table-hint{margin-left:10u;letter-spacing:0;font-size:7.33u;font-weight:300;color:var(--grey)}
.bsd-table-value{display:block;width:124u;min-height:14u;margin:0 15.4u 0 auto;padding:0 1u 1.4u;border-bottom:.8u solid var(--tan);font-size:9.33u;line-height:12.6u;font-weight:400;color:var(--ink);text-align:left;transform:translateY(-1.4u);overflow-wrap:anywhere}

/* ---- boxes ---- */
.bsd-summary{margin-top:38.1u;background:var(--card);border:.8u solid var(--hair);border-radius:9u;padding:17.7u 21.3u 11.6u}
.bsd-box-label{font-size:7.33u;line-height:1.4;font-weight:500;letter-spacing:.34em;color:var(--grey);text-transform:uppercase}
.bsd .bsd-summary .bsd-fields{margin-top:10.4u;grid-template-columns:repeat(var(--cols,3),122.3u);column-gap:24u;row-gap:14u}
.bsd .bsd-summary .bsd-field-value{min-height:11.77u}
.bsd-summary .bsd-field-label{letter-spacing:.235em}
.bsd-paybox{position:relative;margin-top:44u;background:var(--ink);border-radius:9u;padding:12.7u 22u 5.6u}
.bsd-paybox::before,.bsd-callout::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3.6u;background:var(--amber)}
.bsd-paybox .bsd-box-label{color:var(--amber);letter-spacing:.32em}
.bsd-paybox-name{margin-top:7u;font-size:10u;line-height:1.4;font-weight:500;color:var(--paper)}
.bsd .bsd-paybox .bsd-fields{margin-top:7.6u;grid-template-columns:repeat(var(--cols,3),118.3u);column-gap:22u;row-gap:10u}
.bsd .bsd-paybox .bsd-field-label{color:#9A9AA2;font-size:6.1u;letter-spacing:.27em}
.bsd .bsd-paybox .bsd-field-value{border-bottom-color:#4A4B55;color:var(--paper);min-height:11.9u;margin-top:0}
.bsd-paybox+.bsd-note{margin-top:10.8u}
.bsd-callout{position:relative;margin-top:21u;background:var(--ink);border-radius:9u;padding:12.6u 37.75u 4.3u 22.1u;min-height:73.7u}
.bsd-callout--teal::before{background:var(--teal)}
.bsd-callout--red::before{background:var(--red)}
.bsd-fields+.bsd-callout{margin-top:45u}
.bsd-fields--stack+.bsd-callout{margin-top:46.4u}
.bsd-clause+.bsd-callout{margin-top:27.6u}
.bsd-clause:has(>.bsd-list:last-child)+.bsd-callout{margin-top:21u}
.bsd-toc+.bsd-callout{margin-top:26.5u}
.bsd-steps+.bsd-callout{margin-top:17.6u}
.bsd-callout-label{font-size:7.33u;line-height:1.4;font-weight:500;letter-spacing:.34em;color:var(--amber);text-transform:uppercase}
.bsd-callout--teal .bsd-callout-label{color:var(--teal)}
.bsd-callout--red .bsd-callout-label{color:var(--red)}
.bsd-callout-text{margin-top:2.53u;font-size:9.4u;line-height:14.67u;font-weight:500;color:var(--paper)}
.bsd--short .bsd-callout{margin-top:18.7u;min-height:34u;padding:8.4u 20u 3.9u 20.1u}
.bsd--short .bsd-callout::before{width:3.4u}
.bsd--short .bsd-callout-label{font-size:6.67u;letter-spacing:.325em}
.bsd--short .bsd-callout-text{margin-top:1.67u;font-size:7.67u;line-height:1.4;font-weight:300}

/* ---- stepper ---- */
.bsd-steps{margin-top:22.2u}
.bsd-steps-label{font-size:7.67u;line-height:1.4;font-weight:500;letter-spacing:.36em;color:var(--grey);text-transform:uppercase}
.bsd-steps ol{position:relative;margin-top:22u;display:grid;grid-template-columns:repeat(var(--cols,5),minmax(0,1fr))}
.bsd-steps-label:empty+ol{margin-top:0}
.bsd-steps ol::before{content:'';position:absolute;top:10.5u;left:calc(50% / var(--cols,5));right:calc(50% / var(--cols,5));border-top:1u solid var(--hair)}
.bsd-steps li{position:relative;display:flex;flex-direction:column;align-items:center;text-align:center}
.bsd-step-num{width:22u;height:22u;border-radius:50%;border:1.6u solid var(--teal);background:var(--cream);color:var(--teal);display:flex;align-items:center;justify-content:center;font-size:8u;line-height:1;font-weight:700}
.bsd-steps li:nth-child(5n+2) .bsd-step-num,.bsd-steps li:nth-child(5n+4) .bsd-step-num{border-color:var(--amber);color:var(--amber)}
.bsd-steps li:nth-child(5n) .bsd-step-num{border-color:var(--red);color:var(--red)}
.bsd-step-label{margin-top:4.4u;max-width:60u;text-wrap:balance;font-size:7.33u;line-height:10u;font-weight:700;letter-spacing:.17em;margin-right:-.17em;color:var(--ink);text-transform:uppercase}

/* ---- two columns ---- */
.bsd-cols{margin-top:9.7u;display:grid;grid-template-columns:repeat(var(--cols,2),minmax(0,1fr));column-gap:30.9u;align-items:start}
.bsd-col{display:flex;flex-direction:column;min-width:0}
.bsd-col>*{flex:none}

/* ---- signatures ---- */
.bsd-sign{margin-top:25.2u;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);column-gap:50.4u;align-items:start}
.bsd-sign h3{font-size:12u;line-height:1.4;font-weight:700;color:var(--ink);letter-spacing:.048em;white-space:nowrap}
.bsd-sign-sub{white-space:nowrap;margin-top:3.2u;font-size:8.4u;line-height:1.4;font-weight:300;color:var(--grey)}
.bsd-sign-rows{margin-top:4.1u}
.bsd-sign-value{height:39u;display:flex;align-items:flex-end;padding:0 1u 2.2u;border-bottom:.9u solid var(--tan);font-size:9.33u;line-height:12.6u;font-weight:400;color:var(--ink);white-space:nowrap;overflow:hidden}
.bsd-sign-value.is-script{font-family:var(--serif);font-style:italic;font-weight:400;font-size:17u;line-height:20u;padding-bottom:2.6u}
.bsd-sign-label{margin-top:5.55u;font-size:6.67u;line-height:1.4;font-weight:500;letter-spacing:.3em;color:var(--grey);text-transform:uppercase}
.bsd-sign-pair{display:grid;grid-template-columns:1fr 1fr;column-gap:16u}
.bsd-sign-accepted{margin-top:7u;font-size:7.33u;line-height:1.4;font-weight:300;color:var(--grey)}
.bsd-sign--short{margin-top:12.3u;column-gap:46u}
.bsd-sign--short h3{font-size:10.67u;letter-spacing:.038em}
.bsd-sign--short .bsd-sign-sub{margin-top:2.1u;font-size:7.15u}
.bsd-sign--short .bsd-sign-rows{margin-top:3.7u}
.bsd-sign--short .bsd-sign-value{height:20.23u;font-size:8.33u;line-height:11u;padding-bottom:1.6u}
.bsd-sign--short .bsd-sign-value.is-script{font-size:13u;line-height:15u;padding-bottom:1.8u}
.bsd-sign--short .bsd-sign-label{margin-top:4.35u;font-size:6.33u;letter-spacing:.278em}
.bsd-sign--short .bsd-sign-pair .bsd-sign-value{height:21.23u}
.bsd-sign--short .bsd-sign-accepted{margin-top:2u;font-size:6.33u}
.bsd-footnote{position:relative;margin-top:auto;height:79.9u;border-top:.7u solid var(--hair);padding-top:11.5u}
.bsd-footnote .bsd-note{margin-top:0;max-width:362u;font-size:7.76u;line-height:12u}
.bsd-footnote img{position:absolute;right:11u;top:32u;width:80u;height:auto}

/* ---- contents ---- */
.bsd-toc{margin-top:17.8u}
.bsd-toc li{display:flex;align-items:center;height:24.97u;line-height:24.97u;white-space:nowrap}
.bsd-toc-num{flex:none;width:34u;font-size:9.67u;font-weight:700;color:var(--red);transform:translateY(.75u)}
.bsd-toc-title{flex:none;font-size:10.45u;font-weight:500;color:var(--ink);letter-spacing:.018em}
.bsd-toc-lead{flex:1 1 auto;margin-left:10u;height:.8u;transform:translateY(1u);background-image:linear-gradient(to right,var(--hair) 0,var(--hair) .9u,transparent .9u);background-size:3.2u .8u;background-repeat:repeat-x;background-position:right center}
.bsd-contents-head h2{margin-top:.7u;font-size:34u;line-height:47.6u;font-weight:700;color:var(--ink);letter-spacing:.007em}
.bsd-contents-head .bsd-eyebrow-num{font-size:10u}
.bsd-contents-head .bsd-eyebrow-text{margin-left:11.7u}
.bsd-contents-head .bsd-squiggle{top:calc(100% + 1.7u);width:119.9u;max-width:none}

/* ---- cover ---- */
.bsd-cover{flex:1 1 auto;display:flex;flex-direction:column;align-items:center;padding:63.85u var(--mxr) 0 var(--mx)}
.bsd-cover-strap{align-self:stretch;display:flex;justify-content:space-between;border-top:1.1u solid var(--ink);padding-top:11.05u;font-size:7.67u;line-height:1.4;font-weight:500;letter-spacing:.333em;text-transform:uppercase;color:var(--ink);white-space:nowrap}
.bsd-cover-strap span+span{color:var(--grey);margin-right:-.333em}
.bsd-cover-logo{margin-top:108.2u;width:299.6u;height:auto}
.bsd-cover-title{margin-top:37.9u;font-size:46u;line-height:52u;font-weight:700;color:var(--ink);letter-spacing:.134em;text-indent:.134em;text-align:center;text-transform:uppercase}
.bsd-cover-title span{display:block;white-space:nowrap}
.bsd-cover-bar{margin-top:14.9u;width:52u;height:2u;background:var(--red)}
.bsd-cover-sub{margin-top:17.9u;font-family:var(--serif);font-style:italic;font-size:12u;line-height:16.8u;color:var(--ink2);text-align:center}
.bsd-party{position:relative;align-self:stretch;margin-top:22.9u;height:117.9u;background:var(--card);border:.8u solid var(--hair);border-radius:10u}
.bsd-party>*{position:absolute;white-space:nowrap}
.bsd-party-between,.bsd-party-clabel,.bsd-cover-field-label{font-weight:500;letter-spacing:.285em;color:var(--grey);text-transform:uppercase;line-height:1.4}
.bsd-party-between{left:25.3u;top:19.9u;font-size:7.33u;letter-spacing:.35em}
.bsd-party-studio{left:25.3u;top:35.9u;font-size:13u;line-height:1.4;font-weight:700;color:var(--ink);letter-spacing:.03em}
.bsd-party-studio-sub{left:25.3u;top:56.5u;font-size:8.33u;line-height:1.4;font-weight:300;color:var(--ink2)}
.bsd-party-and{left:231.6u;top:46.3u;font-family:var(--serif);font-style:italic;font-size:11u;line-height:1.278;color:var(--red)}
.bsd-party-clabel{left:280.9u;top:35.5u;font-size:6.67u}
.bsd-party-client{left:280.5u;right:25.1u;top:39u;height:16.5u;display:flex;align-items:flex-end;padding:0 1u 1.6u;border-bottom:.8u solid var(--tan);font-size:10u;line-height:12u;font-weight:500;color:var(--ink);overflow:hidden}
.bsd-party-cnote{left:283u;top:61.5u;font-size:7.67u;line-height:1.4;font-weight:300;color:var(--grey)}
.bsd-cover-fields{align-self:stretch;margin-top:20.5u;display:flex;gap:30u}
.bsd-cover-field{width:199.8u}
.bsd-cover-field+.bsd-cover-field{width:159.8u}
.bsd-cover-field-label{font-size:6.67u;letter-spacing:.265em}
.bsd-cover-field-value{height:10.57u;display:flex;align-items:flex-end;padding:0 1u 1.4u;border-bottom:.8u solid var(--tan);font-size:9.33u;line-height:11u;font-weight:400;color:var(--ink);white-space:nowrap;overflow:hidden}
.bsd-cover-note{margin-top:38.1u;font-size:7.67u;line-height:1.4;font-weight:300;color:var(--grey);text-align:center;letter-spacing:.035em}
.bsd-cover-squiggle{margin-top:17u;width:80u;height:auto}
.bsd--short .bsd-cover{padding-top:61.85u}
.bsd--short .bsd-cover-strap{font-size:7.33u;padding-top:10.9u;letter-spacing:.35em}
.bsd--short .bsd-cover-logo{margin-top:91.8u;width:279.7u}
.bsd--short .bsd-cover-title{margin-top:37.4u;font-size:44u;line-height:50u}
.bsd--short .bsd-cover-bar{margin-top:15.5u;width:48u}
.bsd--short .bsd-party{margin-top:21.7u;height:141.8u}
.bsd--short .bsd-party-between{left:23.3u;top:18.2u;font-size:7u}
.bsd--short .bsd-party-studio{left:23.3u;top:34.8u}
.bsd--short .bsd-party-studio-sub{left:23.3u;top:53.8u;font-size:8u}
.bsd--short .bsd-party-and{left:265.7u;top:40.2u}
.bsd--short .bsd-party-clabel{left:304.9u;top:32.8u;font-size:6.33u}
.bsd--short .bsd-party-client{left:304.5u;right:15.2u;top:35u}
.bsd--short .bsd-party-cnote{left:307u;top:55.9u;font-size:7.33u}
.bsd--short .bsd-cover-fields{left:23.2u;top:96.8u;margin:0;gap:24u}
.bsd--short .bsd-cover-field,.bsd--short .bsd-cover-field+.bsd-cover-field{width:209.4u}
.bsd--short .bsd-cover-field-label{font-size:6.33u;letter-spacing:.285em}
.bsd--short .bsd-cover-field-value{height:10.3u}
.bsd--short .bsd-cover-note{margin-top:32.5u}

/* ---- back cover ---- */
.bsd-back{flex:1 1 auto;position:relative;display:flex;flex-direction:column;align-items:center;padding-top:267.8u;text-align:center;white-space:nowrap}
.bsd-back-logo{width:259.7u;height:auto}
.bsd-back-strap{margin-top:33.4u;font-size:9.33u;line-height:1.4;font-weight:500;letter-spacing:.4em;text-indent:.4em;color:#B9B3AB;text-transform:uppercase}
.bsd-back-bar{margin-top:26u;width:159.8u;border-top:.8u solid #3C3D45}
.bsd-back-title{margin-top:22.8u;font-family:var(--serif);font-style:italic;font-size:12u;line-height:1.278;color:var(--paper)}
.bsd-back-sub{margin-top:9.4u;font-size:8.33u;line-height:1.4;font-weight:300;color:#8A8A92}
.bsd-back-foot{position:absolute;left:0;right:0;top:750u;font-size:7.33u;line-height:1.4;font-weight:500;letter-spacing:.36em;text-indent:.36em;color:#9A9AA2;text-transform:uppercase}

.bsd-nb{white-space:nowrap}
.bsd-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap}

@media print{
  @page{size:A4;margin:0}
  html,body{margin:0!important;padding:0!important;background:#fff!important}
  .bsd{width:210mm;margin:0;padding:0}
  .bsd-sheet{width:210mm;max-width:none;min-height:296.9mm;aspect-ratio:auto;margin:0;box-shadow:none;break-after:page;page-break-after:always;break-inside:avoid;page-break-inside:avoid}
  .bsd-sheet:last-child{break-after:auto;page-break-after:auto}
}
`;

/** CSS for `<RichDocument>`: inject once with a `<style>` tag. Scoped to `.bsd`. */
export const RICH_DOCUMENT_CSS = SOURCE.replace(
  /(-?(?:\d+\.\d+|\.\d+|\d+))u\b/g,
  (_match, points: string) => `calc(var(--u) * ${points})`,
);
