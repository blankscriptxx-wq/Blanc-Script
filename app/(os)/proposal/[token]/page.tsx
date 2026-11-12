import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Poppins } from "next/font/google";
import { AcceptProposal } from "@/components/proposals/accept-proposal";
import { PROPOSAL_CSS } from "@/components/proposals/proposal-styles";
import { getCurrentUser } from "@/lib/auth/session";
import { getPublicProposal } from "@/lib/data/proposals";

export const dynamic = "force-dynamic";

const poppins = Poppins({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], display: "swap" });

export const metadata: Metadata = {
  title: "Your proposal · Blanc Script",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const day = new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "Europe/London" });

/** A client's proposal: a private, branded page they can read and accept without an account. */
export default async function ProposalPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { token } = await params;
  const { preview } = await searchParams;
  // Staff can preview a draft; their own visits don't count as the client viewing it.
  const staff = preview ? await getCurrentUser().catch(() => null) : null;
  const p = await getPublicProposal(token, { preview: Boolean(staff), track: !staff });
  if (!p) notFound();
  const c = p.content;
  const isPreview = Boolean(staff);
  const heroLines = c.heroLines.filter(Boolean);

  return (
    <div className={`bsp ${poppins.className}`}>
      <style dangerouslySetInnerHTML={{ __html: PROPOSAL_CSS }} />
      {isPreview ? <div className="previewbar">Preview — this is what your client will see</div> : null}

      <nav>
        <div className="navin">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="navlogo" src="/brand/logo-dark.png" alt="Blanc Script" />
          <div className="navlinks">
            <a href="#opportunity">Opportunity</a>
            <a href="#why">Why now</a>
            <a href="#content">Content</a>
            <a href="#how">How it works</a>
            <a href="#investment">Investment</a>
          </div>
          <a className="navcta" href="#close">{p.status === "accepted" ? "Accepted" : "Let's talk"}</a>
        </div>
      </nav>

      <section id="hero">
        <div className="bigmark" aria-hidden>Blanc Script.</div>
        <div className="wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="herologo" src="/brand/logo-dark.png" alt="Blanc Script" />
          <h1 className="hero-h">
            {heroLines.map((line, i) => (
              <span key={i} className={i === heroLines.length - 1 ? "r" : undefined} style={{ display: "block" }}>
                {line}
              </span>
            ))}
          </h1>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="hero-sq" src="/brand/squiggle.png" alt="" />
          <p className="hero-for">{c.heroIntro}</p>
          <div className="vtag">
            {c.preparedFor} <span>· prepared for you</span>
          </div>
        </div>
      </section>

      <section id="opportunity" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <span className="eyebrow">The opportunity</span>
          <h2 className="sec">{c.opportunity.heading}</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="sqline" src="/brand/squiggle.png" alt="" />
          <p className="lead">{c.opportunity.body}</p>
          {c.opportunity.stats.length ? (
            <div className="statgrid">
              {c.opportunity.stats.map((s, i) => (
                <div className="stat" key={i}>
                  <div className="n">{s.value}</div>
                  <div className="l">{s.label}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section id="why" className="band">
        <div className="wrap">
          <span className="eyebrow">Why now</span>
          <h2 className="sec">{c.whyNow.heading}</h2>
          <p className="lead" style={{ marginTop: 26 }}>{c.whyNow.body}</p>
          <div className="insight">
            {c.whyNow.cards.map((card, i) => (
              <div className="icard" key={i}>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="content">
        <div className="wrap">
          <span className="eyebrow">What we&rsquo;d create</span>
          <h2 className="sec">{c.create.heading}</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="sqline" src="/brand/squiggle.png" alt="" />
          <p className="lead">{c.create.body}</p>
          <div className="pillars">
            {c.create.pillars.map((pl, i) => (
              <div className="pill" key={i}>
                <div className="dot" />
                <h3>{pl.title}</h3>
                <p>{pl.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <span className="eyebrow">How it works</span>
          <h2 className="sec">{c.process.heading}</h2>
          <div className="flow">
            {c.process.steps.map((s, i) => (
              <div className="step" key={i}>
                <div className="snum">{i + 1}</div>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="investment" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="invest">
            <span className="eyebrow">The investment</span>
            <h3>{c.investment.heading}</h3>
            <div className="big">
              {c.investment.price} {c.investment.priceNote ? <span className="u">— {c.investment.priceNote}</span> : null}
            </div>
            <p>{c.investment.body}</p>
            {c.investment.includes.length ? (
              <div className="row">
                {c.investment.includes.map((x, i) => (
                  <div className="ichip" key={i}>
                    <b>✓</b>
                    {x}
                  </div>
                ))}
              </div>
            ) : null}
            <p className="fine">Prices exclude VAT; no VAT is charged.</p>
          </div>
        </div>
      </section>

      <section id="close">
        <div className="wrap">
          <h2>{c.close.heading}</h2>
          <p className="lead">{c.close.body}</p>
          {p.status === "accepted" ? (
            <div className="accepted">
              ✓ Accepted by {p.acceptedByName}
              {p.acceptedAt ? ` on ${day.format(p.acceptedAt)}` : ""}
            </div>
          ) : isPreview ? null : (
            <AcceptProposal token={token} />
          )}
          <div className="ctabtns">
            <a className="btn ghost" href={`mailto:${p.agencyEmail}`}>Ask us a question</a>
            <a className="btn ghost" href="https://www.blancscript.com" target="_blank" rel="noopener">blancscript.com</a>
          </div>
        </div>
      </section>

      <footer>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="fl" src="/brand/logo-light.png" alt="Blanc Script" />
        <div>Content · Creativity · Impact</div>
        <div className="dots">Prepared for {c.preparedFor} &nbsp;·&nbsp; Confidential</div>
      </footer>
    </div>
  );
}
