import { useListCategories } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";

export default function Categories() {
  const { data: categories, isLoading } = useListCategories({ query: { queryKey: ["categories"] } });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground">Manage your transaction categorization rules</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <div>Loading...</div>
        ) : categories && categories.length > 0 ? (
          categories.map((cat) => (
            <Card key={cat.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: cat.color }}>
                  {cat.icon || cat.name.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold">{cat.name}</div>
                  <div className="text-xs text-muted-foreground capitalize">{cat.type} • {cat.transactionCount || 0} txns</div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-muted-foreground border border-dashed rounded-md">
            No categories found.
          </div>
        )}
      </div>
    </div>
  );
}
