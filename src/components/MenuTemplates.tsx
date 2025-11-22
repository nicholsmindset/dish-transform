import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MenuItem {
  id: string;
  dish_name: string;
  description: string | null;
  price: number | null;
  section: string | null;
  image_url: string;
}

interface MenuTemplateProps {
  template: string;
  items: MenuItem[];
  groupedItems: Record<string, MenuItem[]>;
}

export function MenuTemplate({ template, items, groupedItems }: MenuTemplateProps) {
  if (template === 'elegant') {
    return (
      <div className="space-y-16">
        {Object.entries(groupedItems).map(([section, sectionItems]) => (
          <div key={section} className="text-center">
            <div className="mb-12">
              <h2 className="text-4xl font-bold mb-2 capitalize font-serif">
                {section}
              </h2>
              <div className="w-24 h-1 mx-auto bg-gradient-hero rounded-full" />
            </div>
            
            <div className="space-y-8 max-w-3xl mx-auto">
              {sectionItems.map((item) => (
                <div key={item.id} className="border-b border-border pb-8 last:border-0">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-2xl font-semibold">{item.dish_name}</h3>
                    {item.price && (
                      <span className="text-2xl font-bold text-primary">
                        ${item.price.toFixed(2)}
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-muted-foreground italic mb-4">
                      {item.description}
                    </p>
                  )}
                  <img
                    src={item.image_url}
                    alt={item.dish_name}
                    className="w-full h-64 object-cover rounded-lg shadow-food mx-auto"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (template === 'list') {
    return (
      <div className="space-y-12">
        {Object.entries(groupedItems).map(([section, sectionItems]) => (
          <div key={section}>
            <h2 className="text-3xl font-bold mb-6 capitalize">{section}</h2>
            <div className="space-y-6">
              {sectionItems.map((item) => (
                <Card key={item.id} className="overflow-hidden hover:shadow-food transition-shadow">
                  <div className="flex flex-col md:flex-row">
                    <img
                      src={item.image_url}
                      alt={item.dish_name}
                      className="w-full md:w-64 h-64 object-cover"
                    />
                    <div className="p-6 flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-2xl font-semibold">{item.dish_name}</h3>
                        {item.price && (
                          <Badge variant="secondary" className="text-xl">
                            ${item.price.toFixed(2)}
                          </Badge>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-muted-foreground">{item.description}</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Default grid template
  return (
    <div className="space-y-12">
      {Object.entries(groupedItems).map(([section, sectionItems]) => (
        <div key={section}>
          <h2 className="text-3xl font-bold mb-6 capitalize">{section}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sectionItems.map((item) => (
              <Card key={item.id} className="overflow-hidden hover:shadow-food transition-shadow">
                <img
                  src={item.image_url}
                  alt={item.dish_name}
                  className="w-full h-64 object-cover"
                />
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-semibold">{item.dish_name}</h3>
                    {item.price && (
                      <Badge variant="secondary" className="text-lg">
                        ${item.price.toFixed(2)}
                      </Badge>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-muted-foreground text-sm">{item.description}</p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
