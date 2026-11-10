import type { Category, Product, StockMovement, Supplier } from '@/lib/types'

// ─── Seed dataset: "Northgate Supply Co." demo inventory ────────────────────
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
    { id: 'cat-1', name: 'Electronics', description: 'Devices, accessories and electronic components', createdAt: iso(120) },
    { id: 'cat-2', name: 'Office Supplies', description: 'Everyday stationery and office essentials', createdAt: iso(118) },
    { id: 'cat-3', name: 'Furniture', description: 'Desks, chairs and workspace furniture', createdAt: iso(110) },
    { id: 'cat-4', name: 'Packaging & Shipping', description: 'Boxes, tape, labels and mailing supplies', createdAt: iso(96) },
    { id: 'cat-5', name: 'Cleaning & Safety', description: 'Janitorial products and workplace safety gear', createdAt: iso(90) },
  ]

  const suppliers: Supplier[] = [
    { id: 'sup-1', name: 'Brightline Electronics', contactPerson: 'Maya Chen', email: 'maya.chen@brightline.example', phone: '+1 (555) 014-2298', address: '88 Harbor Ave, Suite 400, Seattle, WA 98104', createdAt: iso(115) },
    { id: 'sup-2', name: 'PaperTrail Distribution', contactPerson: 'Daniel Okafor', email: 'daniel@papertrail.example', phone: '+1 (555) 019-7741', address: '2210 Mill Rd, Portland, OR 97218', createdAt: iso(112) },
    { id: 'sup-3', name: 'Ironwood Furniture Works', contactPerson: 'Sofia Reyes', email: 'sofia@ironwood.example', phone: '+1 (555) 011-3390', address: '19 Timber Ln, Boise, ID 83702', createdAt: iso(108) },
    { id: 'sup-4', name: 'PackRight Wholesale', contactPerson: 'Liam Novak', email: 'liam@packright.example', phone: '+1 (555) 016-8823', address: '490 Freight Way, Reno, NV 89506', createdAt: iso(95) },
    { id: 'sup-5', name: 'SafeGuard Industrial', contactPerson: 'Grace Muller', email: 'grace@safeguard.example', phone: '+1 (555) 013-5567', address: '77 Foundry St, Salt Lake City, UT 84104', createdAt: iso(89) },
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
    mk('prd-01', 'ELC-1001', 'Wireless Optical Mouse', 'cat-1', 'sup-1', 'pcs', 8.4, 15.99, 124, 25, 'A-01', '2.4 GHz wireless mouse with USB nano receiver, 3-button design.', 90),
    mk('prd-02', 'ELC-1002', 'Mechanical Keyboard', 'cat-1', 'sup-1', 'pcs', 34.0, 59.99, 42, 10, 'A-02', '87-key mechanical keyboard, blue switches, braided cable.', 88),
    mk('prd-03', 'ELC-1003', 'USB-C Hub 7-in-1', 'cat-1', 'sup-1', 'pcs', 17.25, 32.5, 8, 12, 'A-03', 'HDMI, 3x USB-A, SD/microSD and 100W PD passthrough.', 74),
    mk('prd-04', 'ELC-1004', '27" LED Monitor', 'cat-1', 'sup-1', 'pcs', 138.0, 219.0, 0, 6, 'A-04', '27-inch Full HD IPS panel, 75 Hz, height-adjustable stand.', 70),
    mk('prd-05', 'OFF-2001', 'A4 Copy Paper (Ream, 500 sheets)', 'cat-2', 'sup-2', 'ream', 3.1, 5.49, 320, 80, 'B-01', '80 gsm bright white multi-purpose copy paper.', 85),
    mk('prd-06', 'OFF-2002', 'Gel Pen (Box of 12)', 'cat-2', 'sup-2', 'box', 2.25, 4.75, 96, 30, 'B-02', '0.5 mm quick-dry black gel pens, box of one dozen.', 82),
    mk('prd-07', 'OFF-2003', 'Spiral Notebook (Pack of 5)', 'cat-2', 'sup-2', 'pack', 4.5, 8.99, 18, 24, 'B-03', 'A5 ruled notebooks, 80 sheets each, assorted covers.', 66),
    mk('prd-08', 'OFF-2004', 'Heavy-Duty Stapler', 'cat-2', 'sup-2', 'pcs', 6.8, 12.99, 54, 15, 'B-04', 'Metal body stapler, 25-sheet capacity, includes staples.', 60),
    mk('prd-09', 'FUR-3001', 'Ergonomic Mesh Office Chair', 'cat-3', 'sup-3', 'pcs', 92.0, 159.0, 21, 6, 'C-01', 'Breathable mesh back, adjustable lumbar support and armrests.', 58),
    mk('prd-10', 'FUR-3002', 'Standing Desk 55"', 'cat-3', 'sup-3', 'pcs', 168.0, 289.0, 11, 5, 'C-02', 'Electric height-adjustable desk, memory preset controller.', 52),
    mk('prd-11', 'FUR-3003', 'Mobile Filing Cabinet (3-Drawer)', 'cat-3', 'sup-3', 'pcs', 48.5, 84.0, 4, 5, 'C-03', 'Locking steel cabinet on casters, letter/A4 hanging rails.', 48),
    mk('prd-12', 'PAK-4001', 'Corrugated Boxes Medium (Pack of 25)', 'cat-4', 'sup-4', 'pack', 12.4, 21.99, 210, 50, 'D-01', '450 x 350 x 300 mm double-wall shipping boxes.', 44),
    mk('prd-13', 'PAK-4002', 'Packing Tape Heavy Duty (6 rolls)', 'cat-4', 'sup-4', 'pack', 7.2, 13.49, 16, 20, 'D-02', '48 mm x 50 m acrylic tape, six rolls per pack.', 40),
    mk('prd-14', 'PAK-4003', '"Fragile" Labels (Roll of 500)', 'cat-4', 'sup-4', 'roll', 3.9, 7.25, 140, 30, 'D-03', 'High-visibility red warning labels, 75 x 50 mm.', 38),
    mk('prd-15', 'SAF-5001', 'Nitrile Gloves (Box of 100)', 'cat-5', 'sup-5', 'box', 5.6, 10.99, 88, 40, 'E-01', 'Powder-free nitrile examination gloves, size M.', 34),
    mk('prd-16', 'SAF-5002', 'First Aid Kit (50-Person)', 'cat-5', 'sup-5', 'pcs', 22.75, 38.99, 12, 8, 'E-02', 'OSHA-compliant wall-mountable first aid station.', 30),
    mk('prd-17', 'SAF-5003', 'Safety Goggles Anti-Fog', 'cat-5', 'sup-5', 'pcs', 3.4, 6.99, 9, 15, 'E-03', 'Wraparound polycarbonate lens, indirect vents.', 26),
  ]

  const mov: (id: string, productId: string, type: StockMovement['type'], quantity: number, resultQuantity: number, note: string, daysAgo: number) => StockMovement =
    (id, productId, type, quantity, resultQuantity, note, daysAgo) => ({
      id,
      productId,
      productName: products.find((p) => p.id === productId)?.name ?? 'Unknown product',
      type,
      quantity,
      resultQuantity,
      note,
      date: iso(daysAgo, 9),
    })

  const movements: StockMovement[] = [
    mov('mov-01', 'prd-01', 'IN', 60, 130, 'Purchase order #PO-1042 received', 8),
    mov('mov-02', 'prd-01', 'OUT', -12, 118, 'Store order #SO-2231', 7),
    mov('mov-03', 'prd-05', 'IN', 40, 320, 'Restock from PaperTrail Distribution', 6),
    mov('mov-04', 'prd-05', 'OUT', -25, 295, 'Bulk order — Riverside Legal office fit-out', 5),
    mov('mov-05', 'prd-11', 'ADJUST', -1, 4, 'Cycle count correction — 1 unit damaged', 4),
    mov('mov-06', 'prd-04', 'OUT', -6, 0, 'Walk-in corporate purchase', 3),
    mov('mov-07', 'prd-15', 'IN', 30, 88, 'Monthly safety supplies restock', 2),
    mov('mov-08', 'prd-13', 'OUT', -9, 16, 'Warehouse transfer to Branch 2', 1),
  ]

  return { categories, suppliers, products, movements }
}
