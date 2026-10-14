import "./_group.css";

// Extracted from LeaderKitCampaign.astro: book image, frame and caption only.
export function Current() {
  return (
    <section className="book-presentation">
      <div className="current-cover">
        <img src="/__mockup/images/book-presentation/current.png" alt="The Adventure of Living with Jesus — This Sunday Leader Kit cover" width={1280} height={1614} />
      </div>
      <h2 className="adventure-title">The Adventure of Living with Jesus</h2>
      <h3 className="flow-title">A Simple 5-minute flow</h3>
    </section>
  );
}
