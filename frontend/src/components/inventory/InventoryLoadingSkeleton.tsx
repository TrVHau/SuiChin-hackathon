export default function InventoryLoadingSkeleton() {
  return (
    <div className="space-y-10">
      <section>
        <div className="h-8 w-40 bg-gray-200 rounded-2xl mb-4 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="rounded-3xl border-4 border-gray-200 bg-gray-100 p-4 animate-pulse"
            >
              <div className="w-full aspect-square rounded-2xl mb-3 bg-gray-200" />
              <div className="h-4 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-16 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
