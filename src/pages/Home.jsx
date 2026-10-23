import { Link } from "react-router-dom";
import { useAuth } from "../auth/context";
import "./Home.css";

const steps = [
  {
    number: "01",
    title: "Ask your campus.",
    description:
      "Choose an RIT location and post your question. Five points are held as a reward, and your request stays open for one hour.",
  },
  {
    number: "02",
    title: "Share what you know.",
    description:
      "See a question you can answer? Send a helpful response. A little local knowledge can save someone a trip across campus.",
  },
  {
    number: "03",
    title: "Good answers give back.",
    description:
      "Accept a helpful answer before the request expires. The contributor receives the five points and gains one reputation point.",
  },
];

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="landing">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-container home-hero-grid">
          <div className="home-intro">
            <div className="home-kicker">
              <span className="home-kicker-dot" aria-hidden="true" />
              SMALL QUESTIONS. CAMPUS CONNECTIONS.
            </div>
            <h1 id="home-title">
              Your campus.
              <br />
              A little more
              <br />
              <span>connected.</span>
            </h1>
            <p className="home-lead">
              Is the library busy? Where’s a quiet place to study? CampusPoint
              connects you with people at RIT who can help, one question and one
              useful answer at a time.
            </p>
            <div className="home-actions">
              <Link className="btn btn-primary" to={user ? "/requests" : "/register"}>
                {user ? "Explore campus requests" : "Join CampusPoint"}
                <span aria-hidden="true"> ↗</span>
              </Link>
              <a className="home-text-link" href="#how-it-works">
                See how it works <span aria-hidden="true">↓</span>
              </a>
            </div>
            <p className="home-community-note">
              Built for the Rochester Institute of Technology community.
            </p>
          </div>

          <div className="home-example" aria-label="An illustrative CampusPoint request and answer">
            <div className="home-example-topline">
              <span>A CAMPUSPOINT EXAMPLE</span>
              <span aria-hidden="true">↗</span>
            </div>
            <div className="home-request-preview">
              <div className="home-preview-meta">
                <span className="home-location"><span aria-hidden="true">◎</span> Wallace Library</span>
                <span className="home-reward">5 pts</span>
              </div>
              <h2>A quiet spot between classes?</h2>
              <p>Looking for a place to study at the library. Any quiet tables available?</p>
              <div className="home-request-bottom">
                <span><span className="home-status-dot" aria-hidden="true" /> Open request</span>
                <span>1 hour to find an answer</span>
              </div>
            </div>
            <div className="home-answer-connector" aria-hidden="true"><span />↓</div>
            <div className="home-answer-preview">
              <div className="home-answer-heading">
                <span className="home-answer-avatar" aria-hidden="true">↳</span>
                <div><strong>A little local knowledge</strong><span>A fellow campus member</span></div>
              </div>
              <p>There are a few open tables on the second floor. It’s pretty quiet up here!</p>
              <div className="home-answer-bottom">
                <span><span aria-hidden="true">✓</span> Accepted answer</span>
                <strong>+5 points <span>·</span> +1 reputation</strong>
              </div>
            </div>
            <p className="home-example-caption">A question. A helpful answer. A stronger community.</p>
          </div>
        </div>
      </section>

      <section className="home-about" aria-labelledby="about-title">
        <div className="home-container home-about-grid">
          <div className="home-section-label">THE IDEA BEHIND CAMPUSPOINT</div>
          <div>
            <h2 id="about-title">The best campus resource?<br />The people already there.</h2>
            <p>
              CampusPoint is a location-based request and response platform for
              the RIT community. It brings everyday campus questions into one
              shared space, so you can ask for information, help someone nearby,
              and earn points for answers that make a difference.
            </p>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="home-how" aria-labelledby="how-title">
        <div className="home-container">
          <div className="home-section-label">A LITTLE HELP GOES A LONG WAY</div>
          <h2 id="how-title">From “anyone know?” to “thank you.”</h2>
          <ol className="home-steps">
            {steps.map((step) => (
              <li key={step.number}>
                <span className="home-step-number" aria-hidden="true">{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </li>
            ))}
          </ol>
          <p className="home-points-note">
            <span aria-hidden="true">↺</span>
            No visible answers by the deadline? Your five points are refunded.
            Expired requests with visible answers go to an administrator for resolution.
          </p>
        </div>
      </section>

      <section id="technology" className="home-technology" aria-labelledby="technology-title">
        <div className="home-container home-technology-grid">
          <div>
            <div className="home-section-label">BEHIND THE CONNECTION</div>
            <h2 id="technology-title">A simple experience.<br />Thoughtful technology.</h2>
            <p className="home-tech-intro">
              CampusPoint also explores a distributed systems challenge: keeping
              campus activity and point balances in sync across separate services.
            </p>
            <dl className="home-tech-list">
              <div><dt>React + Vite</dt><dd>A responsive frontend with React Router for navigation and Bootstrap for the interface.</dd></div>
              <div><dt>FastAPI</dt><dd>Two Python services: Campus handles accounts, requests, and answers; Points manages wallets and rewards.</dd></div>
              <div><dt>PostgreSQL + two-phase commit</dt><dd>Each service owns its database. Coordinated transactions keep request actions and their point transfers consistent, with background recovery for interrupted work.</dd></div>
            </dl>
          </div>
          <div className="home-architecture" role="img" aria-label="Architecture: the React frontend calls the Campus FastAPI service, which coordinates with the Points FastAPI service. Each service owns a separate PostgreSQL database. Two-phase commit coordinates changes across both databases.">
            <div className="home-architecture-label">THE PROJECT, AT A GLANCE</div>
            <div className="home-architecture-client"><span aria-hidden="true">▤</span><div><strong>Your browser</strong><span>React frontend</span></div><span className="home-architecture-tag">UI</span></div>
            <div className="home-architecture-line" aria-hidden="true">↓<span>HTTP API</span></div>
            <div className="home-architecture-services">
              <div className="home-architecture-service"><span className="home-service-number">01 / CAMPUS</span><strong>Campus API</strong><span>Accounts & requests</span><div className="home-database">PostgreSQL<span>Campus database</span></div></div>
              <span className="home-service-link" aria-hidden="true">⇄</span>
              <div className="home-architecture-service"><span className="home-service-number">02 / POINTS</span><strong>Points API</strong><span>Wallets & rewards</span><div className="home-database">PostgreSQL<span>Points database</span></div></div>
            </div>
            <div className="home-architecture-footer"><span aria-hidden="true">↔</span> Separate services. One coordinated transaction.</div>
          </div>
        </div>
      </section>

      <section className="home-cta" aria-labelledby="join-title">
        <div className="home-container home-cta-inner">
          <div><div className="home-section-label">YOUR NEXT CAMPUS CONNECTION</div><h2 id="join-title">Someone on campus knows.</h2><p>Ask a question. Share an answer. Be part of CampusPoint.</p></div>
          <Link className="btn btn-primary" to={user ? "/requests" : "/signin"}>
            {user ? "Open your workspace" : "Sign in to get started"} <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
