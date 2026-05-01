export default function Privacy() {
  return (
    <div className="min-h-screen bg-background text-foreground px-6 py-10 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: May 2025</p>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Overview</h2>
        <p className="text-sm leading-relaxed">
          Navelo ("the app") is a London journey planner built by Ayrton Burgess. This policy explains
          what information the app uses and how it is handled.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Information We Collect</h2>
        <p className="text-sm leading-relaxed mb-3">
          Navelo does not collect, store, or share any personal data. Specifically:
        </p>
        <ul className="text-sm leading-relaxed list-disc pl-5 space-y-2">
          <li>
            <strong>Location data</strong> — if you tap "Use my location", your device's GPS
            coordinates are used solely to set your starting point for a journey. This data is
            sent directly to Transport for London's public API to retrieve route options. It is
            never stored, logged, or shared with any third party by Navelo.
          </li>
          <li>
            <strong>Search queries</strong> — place names you type are sent to OpenStreetMap's
            Nominatim geocoding service to find matching locations. These are not stored by Navelo.
          </li>
          <li>
            <strong>Journey results</strong> — route data is fetched from Transport for London's
            publicly available Journey Planner API. No journey history is stored by Navelo.
          </li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Third-Party Services</h2>
        <p className="text-sm leading-relaxed">
          Navelo uses the following public APIs:
        </p>
        <ul className="text-sm leading-relaxed list-disc pl-5 space-y-2 mt-3">
          <li>
            <strong>Transport for London (TfL) Unified API</strong> — for journey planning and
            route data. Subject to{" "}
            <a
              href="https://api.tfl.gov.uk"
              className="underline text-blue-500"
              target="_blank"
              rel="noopener noreferrer"
            >
              TfL's terms
            </a>.
          </li>
          <li>
            <strong>OpenStreetMap Nominatim</strong> — for place search and geocoding. Subject to
            the{" "}
            <a
              href="https://nominatim.org/release-docs/latest/api/Overview/"
              className="underline text-blue-500"
              target="_blank"
              rel="noopener noreferrer"
            >
              Nominatim usage policy
            </a>.
          </li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Data Retention</h2>
        <p className="text-sm leading-relaxed">
          Navelo does not retain any user data. No accounts are created and no information is
          stored on our servers, because Navelo has no servers of its own.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Children's Privacy</h2>
        <p className="text-sm leading-relaxed">
          Navelo does not knowingly collect any information from anyone, including children under
          the age of 13.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Contact</h2>
        <p className="text-sm leading-relaxed">
          If you have any questions about this privacy policy, please contact:{" "}
          <a href="mailto:ayrtonburgess@hotmail.co.uk" className="underline text-blue-500">
            ayrtonburgess@hotmail.co.uk
          </a>
        </p>
      </section>
    </div>
  );
}
