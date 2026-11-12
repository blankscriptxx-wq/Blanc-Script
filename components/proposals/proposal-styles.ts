/** The proposal page's look — Blanc Script cream, ink, red, teal and amber. Scoped to .bsp. */
export const PROPOSAL_CSS = `
.bsp{--cream:#F7EDE2;--cream2:#FDF7F0;--ink:#26272E;--ink2:#3A3B45;--red:#EE3A5F;--teal:#2AA6A8;--amber:#E8A33D;--grey:#8A8A90;--line:#E6D9CA;--shadow:0 18px 50px -24px rgba(38,39,46,.35);
  background:var(--cream);color:var(--ink2);-webkit-font-smoothing:antialiased;line-height:1.6;overflow-x:hidden;min-height:100dvh}
.bsp *{box-sizing:border-box;margin:0;padding:0}
.bsp h1,.bsp h2,.bsp h3{color:var(--ink);line-height:1.05;letter-spacing:-.02em;font-weight:700}
.bsp .wrap{max-width:1040px;margin:0 auto;padding:0 28px}
.bsp nav{position:sticky;top:0;z-index:50;background:rgba(247,237,226,.86);backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}
.bsp .navin{max-width:1040px;margin:0 auto;padding:13px 28px;display:flex;align-items:center;justify-content:space-between;gap:16px}
.bsp .navlogo{height:20px;width:auto}
.bsp .navlinks{display:flex;gap:26px}
.bsp .navlinks a{color:var(--ink2);text-decoration:none;font-size:12.5px;font-weight:500;transition:color .2s}
.bsp .navlinks a:hover{color:var(--red)}
.bsp .navcta{background:var(--ink);color:var(--cream);padding:9px 18px;border-radius:30px;font-size:12.5px;font-weight:600;text-decoration:none;transition:background .2s;white-space:nowrap}
.bsp .navcta:hover{background:var(--red)}
@media(max-width:720px){.bsp .navlinks{display:none}}
.bsp section{padding:104px 0;position:relative}
@media(max-width:720px){.bsp section{padding:72px 0}}
.bsp .eyebrow{display:inline-block;font-size:11px;font-weight:600;letter-spacing:.22em;color:var(--red);margin-bottom:22px;text-transform:uppercase}
.bsp .lead{font-size:clamp(17px,2.3vw,20px);color:var(--ink2);max-width:60ch;font-weight:300;white-space:pre-line}
.bsp h2.sec{font-size:clamp(30px,5vw,52px);max-width:16ch;text-wrap:balance}
.bsp .sqline{width:120px;height:auto;margin:14px 0 26px;display:block}
.bsp #hero{min-height:92dvh;display:flex;flex-direction:column;justify-content:center;padding:90px 0;overflow:hidden}
.bsp #hero .bigmark{font-size:min(31vw,420px);font-weight:700;color:var(--ink);opacity:.035;position:absolute;top:46%;left:50%;transform:translate(-50%,-50%);letter-spacing:-.04em;pointer-events:none;white-space:nowrap}
.bsp .herologo{height:54px;width:auto;margin-bottom:54px;display:block}
.bsp .hero-h{font-size:clamp(44px,8vw,96px);font-weight:700;letter-spacing:-.035em;position:relative}
.bsp .hero-h .r{color:var(--red)}
.bsp .hero-sq{width:min(60%,380px);height:auto;margin:14px 0 30px;display:block}
.bsp .hero-for{font-size:clamp(15px,2.2vw,19px);color:var(--ink2);font-weight:300;max-width:54ch;position:relative}
.bsp .vtag{display:inline-block;margin-top:40px;background:var(--cream2);border:1px solid var(--line);border-radius:40px;padding:11px 22px;font-size:13px;font-weight:600;color:var(--ink);box-shadow:var(--shadow)}
.bsp .vtag span{color:var(--grey);font-weight:400;font-size:12px}
.bsp .statgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:52px}
.bsp .stat{background:var(--cream2);border:1px solid var(--line);border-radius:16px;padding:30px 26px;box-shadow:var(--shadow)}
.bsp .stat .n{font-size:40px;font-weight:700;color:var(--red);line-height:1;letter-spacing:-.03em}
.bsp .stat:nth-child(2) .n{color:var(--teal)} .bsp .stat:nth-child(3) .n{color:var(--amber)}
.bsp .stat .l{font-size:13px;color:var(--ink2);margin-top:12px;font-weight:300}
.bsp .band{background:var(--ink);color:var(--cream)}
.bsp .band h2,.bsp .band h3{color:var(--cream)}
.bsp .band .eyebrow{color:var(--amber)}
.bsp .band .lead{color:#C9C3BB}
.bsp .insight{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-top:50px}
.bsp .icard{background:#2B2C33;border:1px solid #3c3d45;border-radius:14px;padding:26px 24px;position:relative;overflow:hidden}
.bsp .icard::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3.5px;background:var(--teal)}
.bsp .icard:nth-child(3n+2)::before{background:var(--amber)} .bsp .icard:nth-child(3n)::before{background:var(--red)}
.bsp .icard h3{font-size:15px;margin-bottom:9px;letter-spacing:0}
.bsp .icard p{font-size:13.5px;color:#B9B3AB;font-weight:300}
.bsp .pillars{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:50px}
.bsp .pill{background:var(--cream2);border:1px solid var(--line);border-radius:14px;padding:22px 20px;transition:transform .25s,box-shadow .25s}
.bsp .pill:hover{transform:translateY(-4px);box-shadow:var(--shadow)}
.bsp .pill .dot{width:8px;height:8px;border-radius:50%;background:var(--red);margin-bottom:14px}
.bsp .pill:nth-child(3n+2) .dot{background:var(--teal)} .bsp .pill:nth-child(3n) .dot{background:var(--amber)}
.bsp .pill h3{font-size:14.5px;margin-bottom:7px;letter-spacing:0}
.bsp .pill p{font-size:12.5px;color:var(--ink2);font-weight:300;line-height:1.5}
.bsp .flow{margin-top:50px}
.bsp .step{display:flex;gap:22px;align-items:flex-start;padding:0 0 34px;position:relative}
.bsp .step:last-child{padding-bottom:0}
.bsp .step::before{content:'';position:absolute;left:17px;top:34px;bottom:-4px;width:1.5px;background:var(--line)}
.bsp .step:last-child::before{display:none}
.bsp .snum{flex:none;width:36px;height:36px;border-radius:50%;background:var(--cream);border:1.6px solid var(--red);color:var(--red);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;z-index:1}
.bsp .step:nth-child(3n+2) .snum{border-color:var(--teal);color:var(--teal)} .bsp .step:nth-child(3n) .snum{border-color:var(--amber);color:var(--amber)}
.bsp .step h3{font-size:15px;letter-spacing:.06em;margin-bottom:3px;text-transform:uppercase}
.bsp .step p{font-size:13.5px;font-weight:300}
.bsp .invest{background:var(--ink);color:var(--cream);border-radius:22px;padding:52px 46px;position:relative;overflow:hidden}
.bsp .invest .eyebrow{color:var(--amber)}
.bsp .invest h3{color:var(--cream);font-size:30px;margin-bottom:14px;max-width:18ch}
.bsp .invest .big{font-size:clamp(34px,6vw,58px);font-weight:700;color:var(--cream);letter-spacing:-.03em;line-height:1.05}
.bsp .invest .big .u{font-size:18px;font-weight:300;color:#B9B3AB;font-style:italic;letter-spacing:0}
.bsp .invest p{color:#C9C3BB;font-weight:300;max-width:54ch;margin-top:18px;font-size:14.5px;white-space:pre-line}
.bsp .invest .row{display:flex;gap:12px;flex-wrap:wrap;margin-top:30px}
.bsp .ichip{background:#2B2C33;border:1px solid #3c3d45;border-radius:30px;padding:10px 20px;font-size:12.5px;color:var(--cream);font-weight:500}
.bsp .ichip b{color:var(--amber);margin-right:6px}
.bsp .invest .fine{font-size:11.5px;color:#8a8a92;margin-top:22px}
.bsp #close{text-align:center;background:var(--red);color:#fff}
.bsp #close h2{color:#fff;font-size:clamp(32px,6vw,62px);letter-spacing:-.03em;max-width:16ch;margin:0 auto;text-wrap:balance}
.bsp #close .lead{color:rgba(255,255,255,.92);margin:26px auto 0;text-align:center}
.bsp .ctabtns{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-top:44px}
.bsp .btn{padding:16px 34px;border-radius:40px;font-weight:600;font-size:15px;text-decoration:none;transition:transform .2s;border:0;cursor:pointer;font-family:inherit;display:inline-block}
.bsp .btn:hover{transform:translateY(-3px)}
.bsp .btn.dark{background:var(--ink);color:var(--cream)}
.bsp .btn.ghost{background:transparent;border:1.6px solid rgba(255,255,255,.6);color:#fff}
.bsp .btn:disabled{opacity:.6;cursor:default;transform:none}
.bsp .accept{max-width:460px;margin:40px auto 0;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.35);border-radius:18px;padding:24px;text-align:left}
.bsp .accept label{display:block;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px;color:#fff}
.bsp .accept input{width:100%;height:46px;border-radius:10px;border:0;padding:0 14px;font-family:inherit;font-size:15px;color:var(--ink);background:#fff;outline:none}
.bsp .accept .note{font-size:12.5px;color:rgba(255,255,255,.9);margin-top:10px}
.bsp .accept .btn{margin-top:14px;width:100%;text-align:center}
.bsp .accepted{display:inline-block;margin-top:36px;background:#fff;color:var(--ink);border-radius:40px;padding:14px 26px;font-weight:600;font-size:15px}
.bsp footer{background:var(--ink);color:#9a9aa2;text-align:center;padding:44px 20px;font-size:12px}
.bsp footer .fl{height:22px;width:auto;margin:0 auto 18px;opacity:.9;display:block}
.bsp footer .dots{color:#6E6E77;margin-top:8px;font-size:11px;letter-spacing:.08em}
.bsp .previewbar{background:var(--amber);color:var(--ink);text-align:center;font-size:12.5px;font-weight:600;padding:8px 16px}
@media(max-width:760px){.bsp .statgrid,.bsp .insight,.bsp .pillars{grid-template-columns:1fr}.bsp .invest{padding:36px 26px}}
@media print{.bsp nav,.bsp .accept,.bsp .ctabtns,.bsp .previewbar{display:none}.bsp section{padding:48px 0}.bsp #hero{min-height:0}}
`;
