---
import Base from '../layouts/Base.astro';
---
<Base
  path="/piano-lessons"
  title="Piano Lessons in McKinney, TX | Anthem Music"
  description="Piano lessons in downtown McKinney for all ages and levels. Classically trained instructors, personalized instruction, and a real love of music. Book a consultation today.">
  <section class="page-hero">
    <div class="container">
      <span class="eyebrow" style="justify-content:center;">Piano · Keyboard</span>
      <h1 class="center">Piano lessons in McKinney</h1>
      <p class="lead mx-auto center">A classical foundation with modern application — reading, technique, and playing you'll actually enjoy.</p>
      <div class="center" style="margin-top:1.8rem;"><a href="/schedule" class="btn btn-primary">Book a Consultation</a></div>
    </div>
  </section>

  <section class="section">
    <div class="container narrow">
      <h2>Serious fundamentals, taught with warmth</h2>
      <p>Piano is one of the best instruments to learn music on — it builds a foundation that carries into every other instrument. Our instructors are classically trained and bring years of performance and teaching experience, but they teach with the kind of patience and encouragement that keeps students coming back.</p>
      <p>We work with everyone from first-time young beginners to adults returning to the keys and advancing students ready to take their playing to the next level. Lessons are personalized — we build around each student's goals, skill level, and the way they learn.</p>

      <div class="feature-grid">
        <div class="feature"><h3>Strong Foundations</h3><p>Reading, technique, theory, and ear training that transfer to any instrument.</p></div>
        <div class="feature"><h3>Every Age</h3><p>From young beginners through adult learners and advancing students.</p></div>
        <div class="feature"><h3>Real Enjoyment</h3><p>We balance discipline with music students actually want to play.</p></div>
      </div>

      <h2>What a first lesson looks like</h2>
      <p>Every new student starts with a consultation — a one-on-one assessment where we understand your experience, goals, and how you learn. For students with prior experience who want to advance, we build a custom plan around your specific needs. No pressure, just a clear path forward.</p>
    </div>
  </section>

  <section class="cta-band">
    <div class="container cta-inner">
      <div><h2>Start playing piano</h2><p>Book a consultation and we'll match you with the right instructor and a plan to fit your goals.</p></div>
      <a href="/schedule" class="btn btn-primary">Book a Consultation</a>
    </div>
  </section>
</Base>

<style>
  .page-hero { background: var(--cream-soft); padding: clamp(2.5rem,5vw,4rem) 0; }
  .page-hero h1 { margin-bottom: 1rem; }
  .narrow { max-width: 760px; }
  .narrow h2 { margin: 2.5rem 0 1rem; }
  .narrow h2:first-child { margin-top: 0; }
  .narrow p { color: var(--gray); margin-bottom: 1.2rem; }
  .feature-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 1.5rem; margin: 2.5rem 0; }
  .feature { background: var(--cream-soft); border-radius: 12px; padding: 1.6rem; }
  .feature h3 { color: var(--navy); margin-bottom: 0.5rem; font-size: 1.15rem; }
  .feature p { color: var(--gray); font-size: 0.95rem; margin: 0; }
  .cta-band { background: var(--orange); padding: clamp(2.5rem,5vw,4rem) 0; }
  .cta-inner { display: flex; align-items: center; justify-content: space-between; gap: 2rem; flex-wrap: wrap; }
  .cta-band h2 { color: var(--white); margin-bottom: 0.5rem; }
  .cta-band p { color: var(--white); opacity: 0.92; max-width: 46ch; }
  .cta-band .btn-primary { background: var(--white); color: var(--orange-dark); }
  .cta-band .btn-primary:hover { background: var(--navy); color: var(--cream); }
  @media (max-width: 700px) { .feature-grid { grid-template-columns: 1fr; } }
</style>
