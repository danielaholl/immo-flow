/**
 * Admin Dashboard - Makler Property Management
 */
export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-surface border-r border-border p-6">
        <h1 className="text-2xl font-bold text-primary mb-8">ImmoFlow Admin</h1>

        <nav className="space-y-2">
          <a
            href="/"
            className="block px-4 py-3 rounded-lg bg-primary/10 text-primary font-medium"
          >
            📊 Dashboard
          </a>
          <a
            href="/properties"
            className="block px-4 py-3 rounded-lg text-text-secondary hover:bg-surface"
          >
            🏠 Properties
          </a>
          <a
            href="/bookings"
            className="block px-4 py-3 rounded-lg text-text-secondary hover:bg-surface"
          >
            📅 Bookings
          </a>
          <a
            href="/analytics"
            className="block px-4 py-3 rounded-lg text-text-secondary hover:bg-surface"
          >
            📈 Analytics
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-text-primary mb-2">Dashboard</h2>
          <p className="text-text-secondary">Übersicht über deine Properties und Anfragen</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-surface border border-border rounded-lg p-6">
            <div className="text-3xl mb-2">🏠</div>
            <div className="text-2xl font-bold text-text-primary">12</div>
            <div className="text-sm text-text-secondary">Active Properties</div>
          </div>

          <div className="bg-surface border border-border rounded-lg p-6">
            <div className="text-3xl mb-2">👁️</div>
            <div className="text-2xl font-bold text-text-primary">1,234</div>
            <div className="text-sm text-text-secondary">Total Views</div>
          </div>

          <div className="bg-surface border border-border rounded-lg p-6">
            <div className="text-3xl mb-2">📅</div>
            <div className="text-2xl font-bold text-text-primary">8</div>
            <div className="text-sm text-text-secondary">Pending Bookings</div>
          </div>

          <div className="bg-surface border border-border rounded-lg p-6">
            <div className="text-3xl mb-2">❤️</div>
            <div className="text-2xl font-bold text-text-primary">156</div>
            <div className="text-sm text-text-secondary">Total Favorites</div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-surface border border-border rounded-lg p-6">
          <h3 className="text-xl font-bold text-text-primary mb-4">Recent Activity</h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-border">
              <div>
                <p className="font-medium text-text-primary">
                  New booking for "Moderne 3-Zimmer Wohnung"
                </p>
                <p className="text-sm text-text-secondary">2 Stunden ago</p>
              </div>
              <span className="px-3 py-1 bg-warning/10 text-warning rounded-lg text-sm font-medium">
                Pending
              </span>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-border">
              <div>
                <p className="font-medium text-text-primary">Property viewed 15 times today</p>
                <p className="text-sm text-text-secondary">5 Stunden ago</p>
              </div>
              <span className="px-3 py-1 bg-info/10 text-info rounded-lg text-sm font-medium">
                Info
              </span>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-text-primary">New message from customer</p>
                <p className="text-sm text-text-secondary">1 Tag ago</p>
              </div>
              <span className="px-3 py-1 bg-success/10 text-success rounded-lg text-sm font-medium">
                Completed
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
