import type { Category, Product, StockMovement, Supplier } from '@/lib/types'

// ─── Seed dataset: Cafe Shop inventory ──────────────────────────────────────
// Built as a factory so `resetData()` always produces a fresh copy with
// relative dates anchored to "now".

const DAY = 86_400_000

export function buildSeedData(): {
  categories: Category[]
  suppliers: Supplier[]
  products: Product[]
  movements: StockMovement[]
} {
  const now = Date.now()
  const iso = (daysAgo: number, hour = 10) =>
    new Date(now - daysAgo * DAY - hour * 3_600_000).toISOString()

  const categories: Category[] = [
    { id: 'cat-1', name: 'Coffee Beans', description: 'Espresso, house blends and specialty coffee beans', createdAt: iso(120) },
    { id: 'cat-2', name: 'Tea & Beverages', description: 'Tea, matcha and ready-to-serve drink ingredients', createdAt: iso(118) },
    { id: 'cat-3', name: 'Pastries & Bakery', description: 'Fresh pastries, cakes and baked cafe favorites', createdAt: iso(110) },
    { id: 'cat-4', name: 'Syrups & Ingredients', description: 'Flavor syrups, chocolate and drink ingredients', createdAt: iso(96) },
    { id: 'cat-5', name: 'Cups & Takeaway', description: 'Cups, lids, napkins and takeaway supplies', createdAt: iso(90) },
  ]

  const suppliers: Supplier[] = [
    { id: 'sup-1', name: 'Harbor Roast Co.', contactPerson: 'Maya Chen', email: 'maya@harborroast.example', phone: '+1 (555) 014-2298', address: '88 Harbor Ave, Seattle, WA 98104', createdAt: iso(115) },
    { id: 'sup-2', name: 'Willow Tea Traders', contactPerson: 'Daniel Okafor', email: 'daniel@willowtea.example', phone: '+1 (555) 019-7741', address: '2210 Mill Rd, Portland, OR 97218', createdAt: iso(112) },
    { id: 'sup-3', name: 'Morning Crumb Bakery', contactPerson: 'Sofia Reyes', email: 'sofia@morningcrumb.example', phone: '+1 (555) 011-3390', address: '19 Baker Lane, Boise, ID 83702', createdAt: iso(108) },
    { id: 'sup-4', name: 'Sweet Pour Ingredients', contactPerson: 'Liam Novak', email: 'liam@sweetpour.example', phone: '+1 (555) 016-8823', address: '490 Market Way, Reno, NV 89502', createdAt: iso(95) },
    { id: 'sup-5', name: 'ServeWell Packaging', contactPerson: 'Grace Muller', email: 'grace@servewell.example', phone: '+1 (555) 013-5567', address: '77 Foundry St, Salt Lake City, UT 84104', createdAt: iso(89) },
  ]

  const mk = (
    id: string, sku: string, name: string, categoryId: string, supplierId: string,
    unit: string, costPrice: number, sellingPrice: number, quantity: number,
    reorderPoint: number, location: string, description: string, createdDaysAgo: number,
  ): Product => ({
    id, sku, name, categoryId, supplierId, unit, costPrice, sellingPrice,
    quantity, reorderPoint, location, description,
    createdAt: iso(createdDaysAgo),
    updatedAt: iso(Math.min(createdDaysAgo - 1, 1)),
  })

  const products: Product[] = [
    mk('prd-01', 'COF-1001', 'House Blend Coffee Beans (1 kg)', 'cat-1', 'sup-1', 'bag', 12.5, 24.0, 38, 12, 'A-01', 'Balanced medium roast with caramel sweetness for espresso and filter coffee.', 90),
    mk('prd-02', 'COF-1002', 'Espresso Roast Beans (1 kg)', 'cat-1', 'sup-1', 'bag', 14.0, 27.0, 22, 10, 'A-02', 'Rich dark roast developed for the cafe espresso bar.', 88),
    mk('prd-03', 'COF-1003', 'Decaf Coffee Beans (1 kg)', 'cat-1', 'sup-1', 'bag', 13.5, 26.0, 8, 10, 'A-03', 'Swiss-water decaffeinated beans with chocolate and nutty notes.', 74),
    mk('prd-04', 'COF-1004', 'Single-Origin Ethiopia Beans (1 kg)', 'cat-1', 'sup-1', 'bag', 16.0, 30.0, 0, 6, 'A-04', 'Seasonal light roast with citrus, floral and stone-fruit notes.', 70),
    mk('prd-05', 'TEA-2001', 'Ceremonial Matcha Powder (500 g)', 'cat-2', 'sup-2', 'tin', 18.0, 34.0, 14, 8, 'B-01', 'Bright ceremonial matcha for lattes, iced drinks and tea service.', 85),
    mk('prd-06', 'TEA-2002', 'Chai Tea Concentrate (1 L)', 'cat-2', 'sup-2', 'bottle', 9.0, 18.0, 18, 8, 'B-02', 'Spiced black tea concentrate with cinnamon, cardamom and clove.', 82),
    mk('prd-07', 'TEA-2003', 'Earl Grey Tea Bags (Box of 100)', 'cat-2', 'sup-2', 'box', 4.5, 9.0, 5, 8, 'B-03', 'Aromatic black tea bags with bergamot and a smooth finish.', 66),
    mk('prd-08', 'TEA-2004', 'Hibiscus Tea Bags (Box of 100)', 'cat-2', 'sup-2', 'box', 3.8, 8.0, 24, 10, 'B-04', 'Caffeine-free floral tea with a bright ruby color.', 60),
    mk('prd-09', 'BAK-3001', 'Butter Croissants (Tray of 12)', 'cat-3', 'sup-3', 'tray', 18.0, 36.0, 36, 12, 'C-01', 'Flaky all-butter croissants delivered fresh for the morning rush.', 58),
    mk('prd-10', 'BAK-3002', 'Blueberry Muffins (Tray of 12)', 'cat-3', 'sup-3', 'tray', 15.0, 30.0, 18, 8, 'C-02', 'Soft bakery muffins packed with blueberries and finished with sugar.', 52),
    mk('prd-11', 'BAK-3003', 'Cinnamon Rolls (Tray of 6)', 'cat-3', 'sup-3', 'tray', 12.0, 25.0, 4, 8, 'C-03', 'Warm cinnamon rolls with vanilla glaze, ready for the display case.', 48),
    mk('prd-12', 'BAK-3004', 'Chocolate Chip Cookies (Box of 24)', 'cat-3', 'sup-3', 'box', 14.0, 28.0, 30, 10, 'C-04', 'Chewy chocolate chip cookies baked in small batches.', 44),
    mk('prd-13', 'ING-4001', 'Vanilla Syrup (1 L)', 'cat-4', 'sup-4', 'bottle', 6.5, 13.0, 9, 12, 'D-01', 'Classic vanilla syrup for flavored lattes, cold brew and iced tea.', 40),
    mk('prd-14', 'ING-4002', 'Caramel Syrup (1 L)', 'cat-4', 'sup-4', 'bottle', 6.5, 13.0, 15, 10, 'D-02', 'Smooth caramel syrup for drinks, desserts and whipped cream toppings.', 38),
    mk('prd-15', 'ING-4003', 'Cocoa Powder (1 kg)', 'cat-4', 'sup-4', 'bag', 8.0, 16.0, 14, 6, 'D-03', 'Dutch-process cocoa powder for mochas, baking and drink finishes.', 34),
    mk('prd-16', 'TAK-5001', 'Hot Drink Cups 12 oz (Pack of 50)', 'cat-5', 'sup-5', 'pack', 5.5, 11.0, 60, 20, 'E-01', 'Double-wall kraft cups sized for hot coffee, tea and cocoa.', 30),
    mk('prd-17', 'TAK-5002', 'Takeaway Lids 12 oz (Pack of 50)', 'cat-5', 'sup-5', 'pack', 4.0, 8.0, 40, 20, 'E-02', 'Secure sip-through lids compatible with the 12 oz hot drink cups.', 26),
  ]

  const mov: (id: string, productId: string, type: StockMovement['type'], quantity: number, resultQuantity: number, note: string, daysAgo: number) => StockMovement =
    (id, productId, type, quantity, resultQuantity, note, daysAgo) => ({
      id, productId,
      productName: products.find((p) => p.id === productId)?.name ?? 'Unknown product',
      type, quantity, resultQuantity, note, date: iso(daysAgo, 9),
    })

  const movements: StockMovement[] = [
    mov('mov-01', 'prd-01', 'IN', 24, 50, 'Weekly coffee bean delivery received', 8),
    mov('mov-02', 'prd-01', 'OUT', -12, 38, 'Morning service usage — house blend', 7),
    mov('mov-03', 'prd-09', 'IN', 24, 48, 'Fresh pastry delivery from Morning Crumb Bakery', 6),
    mov('mov-04', 'prd-09', 'OUT', -12, 36, 'Weekend breakfast service', 5),
    mov('mov-05', 'prd-11', 'ADJUST', -1, 4, 'One cinnamon roll tray damaged in transit', 4),
    mov('mov-06', 'prd-04', 'OUT', -6, 0, 'Single-origin beans used for seasonal pour-over menu', 3),
    mov('mov-07', 'prd-05', 'IN', 8, 14, 'Matcha restock from Willow Tea Traders', 2),
    mov('mov-08', 'prd-13', 'OUT', -5, 9, 'Vanilla syrup used for weekly latte service', 1),
  ]

  return { categories, suppliers, products, movements }
}
