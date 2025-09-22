export interface TableMetadata {
  name: string;
  title: string;
  description: string;
  relationships: string[];
}

export const AVAILABLE_TABLES: TableMetadata[] = [
  {
    name: "orders",
    title: "Orders",
    description: "Customer orders from Toast, Square, and Clover POS systems. Contains order details, amounts, and customer info.",
    relationships: [
      "customers (customer_id)",
      "locations (location_id)",
      "products (via line_items JSONB)",
      "payments (order_id)",
      "inventory_logs (order_id)",
      "order_line_items (order_id)",
    ],
  },
  {
    name: "customers",
    title: "Customers",
    description: "Customer information from Toast, Square, and Clover systems. Includes contact details, addresses, and customer preferences.",
    relationships: ["orders (customer_id)", "locations (location_id)"],
  },
  {
    name: "users",
    title: "Users/Employees",
    description: "Employee and user data from Toast, Square, Clover, and 7shifts. Contains staff information, roles, wages, and employment details.",
    relationships: ["shifts (user_id)", "tasks (assigned_to)", "locations (location_id)", "inventory_logs (performed_by)"],
  },
  {
    name: "products",
    title: "Products/Menu Items",
    description: "Menu items and products from Toast, Square, and Clover. Includes pricing, categories, modifiers, and inventory details.",
    relationships: [
      "inventory (product_id)",
      "orders (via line_items JSONB)",
      "locations (location_id)",
      "product_ingredients (product_id)",
      "product_ingredients (ingridiant_id)",
      "inventory_logs (product_id)",
    ],
  },
  {
    name: "shifts",
    title: "Employee Shifts",
    description: "Employee shift schedules from Toast, Square, Clover, and 7shifts. Contains work hours, attendance, and labor cost data.",
    relationships: ["users (user_id)", "locations (location_id)"],
  },
  {
    name: "tasks",
    title: "Tasks & Training",
    description: "Task management and training assignments from 7shifts and other systems. Includes task status, assignments, and completion data.",
    relationships: ["users (assigned_to)", "locations (location_id)"],
  },
  {
    name: "payments",
    title: "Payments",
    description:
      "Individual payment transactions linked to orders from Toast, Square, and Clover POS systems. Contains payment methods, amounts, processing details, and transaction status.",
    relationships: ["orders (order_id)"],
  },
  {
    name: "product_ingredients",
    title: "Product Ingredients",
    description:
      "Links products to ingredient products with quantity requirements and costs. Self-referencing table for recipe management where products can be made from other products.",
    relationships: ["products (product_id)", "products (ingridiant_id)"],
  },
  {
    name: "locations",
    title: "Restaurant Locations",
    description: "Restaurant location information and integration settings. Central table that connects to all other entities.",
    relationships: [
      "orders (location_id)",
      "users (location_id)",
      "products (location_id)",
      "shifts (location_id)",
      "tasks (location_id)",
      "inventory (location_id)",
      "integrations (location_id)",
    ],
  },
  {
    name: "integrations",
    title: "System Integrations",
    description: "Integration configurations for POS systems, scheduling tools, and other restaurant management platforms.",
    relationships: ["locations (location_id)"],
  },
  {
    name: "inventory_logs",
    title: "Inventory Logs",
    description:
      "Tracks all inventory movements including inputs, outputs, and stock adjustments. Records every transaction that affects product stock levels.",
    relationships: ["products (product_id)", "orders (order_id)", "locations (location_id)", "users (performed_by)"],
  },
  {
    name: "order_line_items",
    title: "Order Line Items",
    description:
      "Individual line items extracted from orders for better queryability and normalization. Contains detailed product information, quantities, and pricing for each item in an order.",
    relationships: ["orders (order_id)", "products (product_id)"],
  },
];

export function getTableByName(tableName: string): TableMetadata | undefined {
  return AVAILABLE_TABLES.find((table) => table.name === tableName);
}

export function getTableMetadataForSelector(): Array<{ title: string; description: string; relationships: string[] }> {
  return AVAILABLE_TABLES.map((table) => ({
    title: table.title,
    description: table.description,
    relationships: table.relationships,
  }));
}

export interface TableField {
  name: string;
  type: string;
  description: string;
  example: string;
}

export interface StructuredTableSchema {
  name: string;
  description: string;
  fields: TableField[];
}

export const STRUCTURED_TABLE_SCHEMAS: Record<string, StructuredTableSchema> = {
  order_line_items: {
    name: "order_line_items",
    description: "Individual line items extracted from orders for better queryability and normalization",
    fields: [
      {
        name: "id",
        type: "uuid",
        description: "Unique identifier for the line item",
        example: "850e8400-e29b-41d4-a716-446655440000",
      },
      {
        name: "order_id",
        type: "uuid",
        description: "Reference to the order this line item belongs to",
        example: "950e8400-e29b-41d4-a716-446655440000",
      },
      {
        name: "platform",
        type: "text",
        description: "POS platform that created the order",
        example: "toast",
      },
      {
        name: "product_id",
        type: "uuid",
        description: "Reference to the product/menu item",
        example: "650e8400-e29b-41d4-a716-446655440000",
      },
      {
        name: "platform_product_id",
        type: "text",
        description: "Original product ID from the POS system",
        example: "prod_001",
      },
      {
        name: "name",
        type: "text",
        description: "Product name at time of order",
        example: "Classic Burger",
      },
      {
        name: "description",
        type: "text",
        description: "Product description at time of order",
        example: "Juicy beef patty with lettuce and tomato",
      },
      {
        name: "sku",
        type: "text",
        description: "Product SKU at time of order",
        example: "BURG-CLASSIC-001",
      },
      {
        name: "price",
        type: "numeric(10,2)",
        description: "Unit price of the item",
        example: "12.99",
      },
      {
        name: "quantity",
        type: "integer",
        description: "Quantity ordered",
        example: "2",
      },
      {
        name: "line_total",
        type: "numeric(10,2)",
        description: "Total for this line item (price * quantity)",
        example: "25.98",
      },
      {
        name: "discount_amount",
        type: "numeric(10,2)",
        description: "Discount applied to this line item",
        example: "2.00",
      },
      {
        name: "tax_amount",
        type: "numeric(10,2)",
        description: "Tax amount for this line item",
        example: "2.08",
      },
      {
        name: "modifiers",
        type: "jsonb",
        description: "Product modifiers and customizations",
        example: '[{"name": "Extra Cheese", "price": 1.50}]',
      },
      {
        name: "special_instructions",
        type: "text",
        description: "Special preparation instructions",
        example: "No onions, extra sauce",
      },
      {
        name: "item_notes",
        type: "text",
        description: "Additional notes for this item",
        example: "Customer allergic to nuts",
      },
      {
        name: "category_id",
        type: "text",
        description: "Product category identifier",
        example: "cat_burgers",
      },
      {
        name: "category_name",
        type: "text",
        description: "Product category name",
        example: "Burgers",
      },
      {
        name: "is_voided",
        type: "boolean",
        description: "Whether this line item was voided",
        example: "false",
      },
      {
        name: "voided_at",
        type: "timestamptz",
        description: "When the line item was voided",
        example: "2025-09-15T20:30:00+00:00",
      },
      {
        name: "voided_reason",
        type: "text",
        description: "Reason for voiding the line item",
        example: "Customer changed mind",
      },
      {
        name: "platform_data",
        type: "jsonb",
        description: "Platform-specific line item data",
        example: '{"toast_item_id": "12345", "kitchen_notes": "Rush order"}',
      },
      {
        name: "created_at",
        type: "timestamptz",
        description: "When the record was created in our system",
        example: "2025-09-16T09:01:06.709666+00:00",
      },
      {
        name: "updated_at",
        type: "timestamptz",
        description: "When the record was last updated in our system",
        example: "2025-09-16T09:01:06.709666+00:00",
      },
    ],
  },
  orders: {
    name: "orders",
    description: "Customer orders from Toast, Square, and Clover POS systems",
    fields: [
      {
        name: "id",
        type: "uuid",
        description: "Unique identifier for the order",
        example: "b50e8400-e29b-41d4-a716-446655440000",
      },
      {
        name: "platform",
        type: "text",
        description: "POS platform that created the order",
        example: "toast",
      },
      {
        name: "platform_order_id",
        type: "text",
        description: "Original order ID from the POS system",
        example: "ord_001",
      },
      {
        name: "external_id",
        type: "text",
        description: "Secondary order identifier",
        example: "ext_12345",
      },
      {
        name: "status",
        type: "text",
        description: "Current status of the order",
        example: "completed",
      },
      {
        name: "state",
        type: "text",
        description: "Current state of the order",
        example: "closed",
      },
      {
        name: "payment_status",
        type: "text",
        description: "Payment status of the order",
        example: "paid",
      },
      {
        name: "created_date",
        type: "timestamptz",
        description: "When the order was created",
        example: "2025-09-15T19:30:00+00:00",
      },
      {
        name: "modified_date",
        type: "timestamptz",
        description: "When the order was last modified",
        example: "2025-09-15T20:00:00+00:00",
      },
      {
        name: "opened_date",
        type: "timestamptz",
        description: "When the order was opened",
        example: "2025-09-15T19:30:00+00:00",
      },
      {
        name: "closed_date",
        type: "timestamptz",
        description: "When the order was closed",
        example: "2025-09-15T20:30:00+00:00",
      },
      {
        name: "paid_date",
        type: "timestamptz",
        description: "When the order was paid",
        example: "2025-09-15T20:15:00+00:00",
      },
      {
        name: "promised_date",
        type: "timestamptz",
        description: "Promised delivery or pickup date",
        example: "2025-09-15T21:00:00+00:00",
      },
      {
        name: "estimated_fulfillment_date",
        type: "timestamptz",
        description: "Estimated completion date",
        example: "2025-09-15T20:45:00+00:00",
      },
      {
        name: "delivered_date",
        type: "timestamptz",
        description: "When the order was delivered",
        example: "2025-09-15T21:00:00+00:00",
      },
      {
        name: "dispatched_date",
        type: "timestamptz",
        description: "When the order was dispatched",
        example: "2025-09-15T20:45:00+00:00",
      },
      {
        name: "currency",
        type: "text",
        description: "Currency code for the order",
        example: "USD",
      },
      {
        name: "subtotal_amount",
        type: "numeric(10,2)",
        description: "Subtotal amount before tax and tip",
        example: "25.98",
      },
      {
        name: "tax_amount",
        type: "numeric(10,2)",
        description: "Tax amount",
        example: "2.60",
      },
      {
        name: "tip_amount",
        type: "numeric(10,2)",
        description: "Tip amount",
        example: "4.50",
      },
      {
        name: "discount_amount",
        type: "numeric(10,2)",
        description: "Discount amount applied",
        example: "2.00",
      },
      {
        name: "service_charge_amount",
        type: "numeric(10,2)",
        description: "Service charge amount",
        example: "1.50",
      },
      {
        name: "total_amount",
        type: "numeric(10,2)",
        description: "Total order amount",
        example: "31.58",
      },
      {
        name: "customer_id",
        type: "uuid",
        description: "Reference to customer who placed the order",
        example: "550e8400-e29b-41d4-a716-446655440022",
      },
      {
        name: "customer_first_name",
        type: "text",
        description: "Customer's first name",
        example: "John",
      },
      {
        name: "customer_last_name",
        type: "text",
        description: "Customer's last name",
        example: "Doe",
      },
      {
        name: "customer_email",
        type: "text",
        description: "Customer's email address",
        example: "john.doe@email.com",
      },
      {
        name: "customer_phone",
        type: "text",
        description: "Customer's phone number",
        example: "+1-555-123-4567",
      },
      {
        name: "location_id",
        type: "uuid",
        description: "Reference to the restaurant location",
        example: "550e8400-e29b-41d4-a716-446655440000",
      },
      {
        name: "delivery_address",
        type: "jsonb",
        description: "Delivery address information stored as JSONB - internal structure not queryable without explicit schema definition",
        example: '{"street": "123 Main St", "city": "New York", "zip": "10001"}',
      },
      {
        name: "delivered_date",
        type: "timestamptz",
        description: "When the order was delivered",
        example: "2025-09-15T21:00:00+00:00",
      },
      {
        name: "dispatched_date",
        type: "timestamptz",
        description: "When the order was dispatched",
        example: "2025-09-15T20:45:00+00:00",
      },
      {
        name: "line_items",
        type: "jsonb",
        description: "Array of ordered items with details stored as JSONB - internal structure not queryable without explicit schema definition",
        example: '[{"price": 12.99, "quantity": 1, "product_id": "650e8400-e29b-41d4-a716-446655440000"}]',
      },
      {
        name: "payments",
        type: "jsonb",
        description: "Payment information stored as JSONB - internal structure not queryable without explicit schema definition",
        example: '[{"method": "credit_card", "amount": 31.58}]',
      },
      {
        name: "discounts",
        type: "jsonb",
        description: "Applied discounts stored as JSONB - internal structure not queryable without explicit schema definition",
        example: '[{"type": "percentage", "value": 10}]',
      },
      {
        name: "taxes",
        type: "jsonb",
        description: "Tax information stored as JSONB - internal structure not queryable without explicit schema definition",
        example: '[{"type": "sales_tax", "rate": 0.08, "amount": 2.60}]',
      },
      {
        name: "service_charges",
        type: "jsonb",
        description: "Service charges applied stored as JSONB - internal structure not queryable without explicit schema definition",
        example: '[{"type": "delivery_fee", "amount": 1.50}]',
      },
      {
        name: "platform_data",
        type: "jsonb",
        description: "Platform-specific data stored as JSONB - internal structure not queryable without explicit schema definition",
        example: '{"toast_order_id": "12345", "special_instructions": "Extra sauce"}',
      },
      {
        name: "created_at",
        type: "timestamptz",
        description: "When the record was created in our system",
        example: "2025-09-16T09:01:06.709666+00:00",
      },
      {
        name: "updated_at",
        type: "timestamptz",
        description: "When the record was last updated in our system",
        example: "2025-09-16T09:01:06.709666+00:00",
      },
    ],
  },

  payments: {
    name: "payments",
    description: "Individual payment records linked to orders from Toast, Square, and Clover POS systems",
    fields: [
      {
        name: "id",
        type: "uuid",
        description: "Unique identifier for the payment",
        example: "c50e8400-e29b-41d4-a716-446655440000",
      },
      {
        name: "order_id",
        type: "uuid",
        description: "Reference to the order this payment belongs to",
        example: "b50e8400-e29b-41d4-a716-446655440000",
      },
      {
        name: "platform",
        type: "text",
        description: "POS platform that processed the payment",
        example: "square",
      },
      {
        name: "platform_payment_id",
        type: "text",
        description: "Original payment ID from the POS system",
        example: "pay_001",
      },
      {
        name: "external_id",
        type: "text",
        description: "Secondary payment identifier",
        example: "ext_pay_12345",
      },
      {
        name: "payment_method",
        type: "text",
        description: "Method of payment used",
        example: "credit_card",
      },
      {
        name: "payment_type",
        type: "text",
        description: "Type of payment transaction",
        example: "sale",
      },
      {
        name: "status",
        type: "text",
        description: "Current status of the payment",
        example: "completed",
      },
      {
        name: "amount",
        type: "numeric(10,2)",
        description: "Payment amount",
        example: "31.58",
      },
      {
        name: "currency",
        type: "text",
        description: "Currency code for the payment",
        example: "USD",
      },
      {
        name: "tip_amount",
        type: "numeric(10,2)",
        description: "Tip amount included in payment",
        example: "4.50",
      },
      {
        name: "processing_fee",
        type: "numeric(10,2)",
        description: "Processing fee charged",
        example: "0.92",
      },
      {
        name: "refunded_amount",
        type: "numeric(10,2)",
        description: "Amount that has been refunded",
        example: "0.00",
      },
      {
        name: "authorized_amount",
        type: "numeric(10,2)",
        description: "Amount that was authorized",
        example: "31.58",
      },
      {
        name: "captured_amount",
        type: "numeric(10,2)",
        description: "Amount that was captured",
        example: "31.58",
      },
      {
        name: "card_brand",
        type: "text",
        description: "Credit card brand if applicable",
        example: "visa",
      },
      {
        name: "card_last_four",
        type: "text",
        description: "Last four digits of card number",
        example: "1234",
      },
      {
        name: "card_exp_month",
        type: "integer",
        description: "Card expiration month",
        example: "12",
      },
      {
        name: "card_exp_year",
        type: "integer",
        description: "Card expiration year",
        example: "2025",
      },
      {
        name: "processor",
        type: "text",
        description: "Payment processor used",
        example: "stripe",
      },
      {
        name: "processor_transaction_id",
        type: "text",
        description: "Transaction ID from payment processor",
        example: "txn_1234567890",
      },
      {
        name: "authorization_code",
        type: "text",
        description: "Authorization code from payment processor",
        example: "AUTH123",
      },
      {
        name: "gateway_response",
        type: "text",
        description: "Response from payment gateway",
        example: "approved",
      },
      {
        name: "processed_at",
        type: "timestamptz",
        description: "When the payment was processed",
        example: "2025-09-15T20:15:00+00:00",
      },
      {
        name: "authorized_at",
        type: "timestamptz",
        description: "When the payment was authorized",
        example: "2025-09-15T20:14:30+00:00",
      },
      {
        name: "captured_at",
        type: "timestamptz",
        description: "When the payment was captured",
        example: "2025-09-15T20:15:00+00:00",
      },
      {
        name: "refunded_at",
        type: "timestamptz",
        description: "When the payment was refunded",
        example: "2025-09-16T10:00:00+00:00",
      },
      {
        name: "voided_at",
        type: "timestamptz",
        description: "When the payment was voided",
        example: "2025-09-15T20:30:00+00:00",
      },
      {
        name: "is_voided",
        type: "boolean",
        description: "Whether the payment is voided",
        example: "false",
      },
      {
        name: "is_refunded",
        type: "boolean",
        description: "Whether the payment has been refunded",
        example: "false",
      },
      {
        name: "is_test_mode",
        type: "boolean",
        description: "Whether this is a test payment",
        example: "false",
      },
      {
        name: "notes",
        type: "text",
        description: "Additional notes about the payment",
        example: "Customer requested receipt via email",
      },
      {
        name: "platform_data",
        type: "jsonb",
        description: "Platform-specific payment data stored as JSONB - internal structure not queryable without explicit schema definition",
        example: '{"square_payment_id": "12345", "receipt_url": "https://..."}',
      },
      {
        name: "created_at",
        type: "timestamptz",
        description: "When the record was created in our system",
        example: "2025-09-16T09:01:06.709666+00:00",
      },
      {
        name: "updated_at",
        type: "timestamptz",
        description: "When the record was last updated in our system",
        example: "2025-09-16T09:01:06.709666+00:00",
      },
    ],
  },

  customers: {
    name: "customers",
    description: "Customer information from Toast, Square, and Clover systems",
    fields: [
      {
        name: "id",
        type: "uuid",
        description: "Unique identifier for the customer",
        example: "550e8400-e29b-41d4-a716-446655440022",
      },
      {
        name: "platform",
        type: "text",
        description: "POS platform that created the customer record",
        example: "square",
      },
      {
        name: "platform_customer_id",
        type: "text",
        description: "Original customer ID from the POS system",
        example: "cust_001",
      },
      {
        name: "external_id",
        type: "text",
        description: "Secondary customer identifier",
        example: "ext_cust_12345",
      },
      {
        name: "reference_id",
        type: "text",
        description: "Reference identifier for the customer",
        example: "ref_12345",
      },
      {
        name: "given_name",
        type: "text",
        description: "Customer's given name (Square terminology)",
        example: "John",
      },
      {
        name: "family_name",
        type: "text",
        description: "Customer's family name (Square terminology)",
        example: "Doe",
      },
      {
        name: "first_name",
        type: "text",
        description: "Customer's first name (Clover terminology)",
        example: "John",
      },
      {
        name: "last_name",
        type: "text",
        description: "Customer's last name (Clover terminology)",
        example: "Doe",
      },
      {
        name: "company_name",
        type: "text",
        description: "Company name if business customer",
        example: "Acme Corp",
      },
      {
        name: "business_name",
        type: "text",
        description: "Business name if business customer",
        example: "Acme Corporation",
      },
      {
        name: "nickname",
        type: "text",
        description: "Customer's nickname",
        example: "Johnny",
      },
      {
        name: "email_address",
        type: "text",
        description: "Customer's email address",
        example: "john.doe@email.com",
      },
      {
        name: "phone_number",
        type: "text",
        description: "Customer's phone number",
        example: "+1-555-123-4567",
      },
      {
        name: "note",
        type: "text",
        description: "Notes about the customer",
        example: "VIP customer, prefers table by window",
      },
      {
        name: "creation_source",
        type: "text",
        description: "How the customer record was created",
        example: "pos_system",
      },
      {
        name: "customer_since",
        type: "timestamptz",
        description: "When the customer first became a customer",
        example: "2024-01-15T10:30:00+00:00",
      },
      {
        name: "marketing_allowed",
        type: "boolean",
        description: "Whether marketing communications are allowed",
        example: "true",
      },
      {
        name: "email_unsubscribed",
        type: "boolean",
        description: "Whether customer has unsubscribed from emails",
        example: "false",
      },
      {
        name: "birth_year",
        type: "integer",
        description: "Customer's birth year",
        example: "1985",
      },
      {
        name: "birth_month",
        type: "integer",
        description: "Customer's birth month",
        example: "6",
      },
      {
        name: "birth_day",
        type: "integer",
        description: "Customer's birth day",
        example: "15",
      },
      {
        name: "address_line_1",
        type: "text",
        description: "First line of address",
        example: "123 Main Street",
      },
      {
        name: "address_line_2",
        type: "text",
        description: "Second line of address",
        example: "Apt 4B",
      },
      {
        name: "address_line_3",
        type: "text",
        description: "Third line of address",
        example: "Building A",
      },
      {
        name: "locality",
        type: "text",
        description: "Locality or neighborhood",
        example: "Downtown",
      },
      {
        name: "city",
        type: "text",
        description: "City",
        example: "New York",
      },
      {
        name: "administrative_district_level_1",
        type: "text",
        description: "State or province (Square terminology)",
        example: "NY",
      },
      {
        name: "state",
        type: "text",
        description: "State or province",
        example: "New York",
      },
      {
        name: "postal_code",
        type: "text",
        description: "Postal code",
        example: "10001",
      },
      {
        name: "zip",
        type: "text",
        description: "ZIP code",
        example: "10001",
      },
      {
        name: "country",
        type: "text",
        description: "Country",
        example: "United States",
      },
      {
        name: "location_id",
        type: "uuid",
        description: "Reference to the restaurant location",
        example: "550e8400-e29b-41d4-a716-446655440000",
      },
      {
        name: "addresses",
        type: "jsonb",
        description: "Array of customer addresses",
        example: '[{"type": "home", "street": "123 Main St", "city": "New York"}]',
      },
      {
        name: "email_addresses",
        type: "jsonb",
        description: "Array of customer email addresses",
        example: '[{"type": "primary", "email": "john@email.com"}]',
      },
      {
        name: "phone_numbers",
        type: "jsonb",
        description: "Array of customer phone numbers",
        example: '[{"type": "mobile", "number": "+1-555-123-4567"}]',
      },
      {
        name: "cards",
        type: "jsonb",
        description: "Payment cards on file",
        example: '[{"last_four": "1234", "brand": "visa"}]',
      },
      {
        name: "group_ids",
        type: "jsonb",
        description: "Customer group identifiers",
        example: '["vip_customers", "loyalty_members"]',
      },
      {
        name: "segment_ids",
        type: "jsonb",
        description: "Customer segment identifiers",
        example: '["high_value", "frequent_diner"]',
      },
      {
        name: "orders",
        type: "jsonb",
        description: "Order history summary",
        example: '{"total_orders": 25, "total_spent": 750.00}',
      },
      {
        name: "preferences",
        type: "jsonb",
        description: "Customer preferences",
        example: '{"dietary_restrictions": ["vegetarian"], "favorite_table": "5"}',
      },
      {
        name: "metadata",
        type: "jsonb",
        description: "Additional customer metadata",
        example: '{"loyalty_points": 1250, "tier": "gold"}',
      },
      {
        name: "platform_data",
        type: "jsonb",
        description: "Platform-specific customer data",
        example: '{"square_customer_id": "12345", "created_source": "online"}',
      },
      {
        name: "version",
        type: "bigint",
        description: "Version number for optimistic locking",
        example: "1",
      },
      {
        name: "is_deleted",
        type: "boolean",
        description: "Whether the customer record is deleted",
        example: "false",
      },
      {
        name: "created_at",
        type: "timestamptz",
        description: "When the record was created in our system",
        example: "2025-09-16T09:01:06.709666+00:00",
      },
      {
        name: "updated_at",
        type: "timestamptz",
        description: "When the record was last updated in our system",
        example: "2025-09-16T09:01:06.709666+00:00",
      },
    ],
  },

  users: {
    name: "users",
    description: "Employee and user data from Toast, Square, Clover, and 7shifts systems",
    fields: [
      {
        name: "id",
        type: "uuid",
        description: "Unique identifier for the user/employee",
        example: "450e8400-e29b-41d4-a716-446655440033",
      },
      {
        name: "platform",
        type: "text",
        description: "Platform that created the user record",
        example: "7shifts",
      },
      {
        name: "platform_user_id",
        type: "text",
        description: "Original user ID from the platform",
        example: "emp_001",
      },
      {
        name: "first_name",
        type: "text",
        description: "Employee's first name",
        example: "Jane",
      },
      {
        name: "last_name",
        type: "text",
        description: "Employee's last name",
        example: "Smith",
      },
      {
        name: "email",
        type: "text",
        description: "Employee's email address",
        example: "jane.smith@restaurant.com",
      },
      {
        name: "phone_number",
        type: "text",
        description: "Employee's phone number",
        example: "+1-555-987-6543",
      },
      {
        name: "role",
        type: "text",
        description: "Employee's role",
        example: "server",
      },
      {
        name: "is_active",
        type: "boolean",
        description: "Whether the user is active",
        example: "true",
      },
      {
        name: "hourly_wage",
        type: "numeric(10,2)",
        description: "Employee's hourly wage",
        example: "15.50",
      },
      {
        name: "location_id",
        type: "uuid",
        description: "Reference to the restaurant location",
        example: "550e8400-e29b-41d4-a716-446655440000",
      },
      {
        name: "created_at",
        type: "timestamptz",
        description: "When the record was created in our system",
        example: "2025-09-16T09:01:06.709666+00:00",
      },
      {
        name: "updated_at",
        type: "timestamptz",
        description: "When the record was last updated in our system",
        example: "2025-09-16T09:01:06.709666+00:00",
      },
    ],
  },

  products: {
    name: "products",
    description: "Menu items and products from Toast, Square, and Clover POS systems",
    fields: [
      {
        name: "id",
        type: "uuid",
        description: "Unique identifier for the product",
        example: "650e8400-e29b-41d4-a716-446655440000",
      },
      {
        name: "platform",
        type: "text",
        description: "POS platform that created the product",
        example: "toast",
      },
      {
        name: "platform_product_id",
        type: "text",
        description: "Original product ID from the POS system",
        example: "prod_001",
      },
      {
        name: "external_id",
        type: "text",
        description: "Secondary product identifier",
        example: "ext_12345",
      },
      {
        name: "name",
        type: "text",
        description: "Product name",
        example: "Classic Burger",
      },
      {
        name: "description",
        type: "text",
        description: "Product description",
        example: "Juicy beef patty with lettuce, tomato, and special sauce",
      },
      {
        name: "kitchen_name",
        type: "text",
        description: "Name displayed in kitchen",
        example: "Burger Classic",
      },
      {
        name: "alternate_name",
        type: "text",
        description: "Alternative product name",
        example: "CB",
      },
      {
        name: "price",
        type: "numeric(10,2)",
        description: "Product price",
        example: "12.99",
      },
      {
        name: "price_type",
        type: "text",
        description: "Type of pricing",
        example: "fixed",
      },
      {
        name: "pricing_strategy",
        type: "text",
        description: "Pricing strategy used",
        example: "standard",
      },
      {
        name: "price_without_vat",
        type: "numeric(10,2)",
        description: "Price excluding VAT",
        example: "10.99",
      },
      {
        name: "sku",
        type: "text",
        description: "Stock Keeping Unit identifier",
        example: "BURG-CLASSIC-001",
      },
      {
        name: "plu",
        type: "text",
        description: "Price Look-Up code",
        example: "1001",
      },
      {
        name: "code",
        type: "text",
        description: "Product code",
        example: "BC001",
      },
      {
        name: "upc",
        type: "text",
        description: "Universal Product Code",
        example: "123456789012",
      },
      {
        name: "category_id",
        type: "text",
        description: "Category identifier",
        example: "cat_burgers",
      },
      {
        name: "category_name",
        type: "text",
        description: "Category name",
        example: "Burgers",
      },
      {
        name: "item_group_id",
        type: "text",
        description: "Item group identifier",
        example: "grp_mains",
      },
      {
        name: "is_available",
        type: "boolean",
        description: "Whether the product is available for sale",
        example: "true",
      },
      {
        name: "is_hidden",
        type: "boolean",
        description: "Whether the product is hidden from display",
        example: "false",
      },
      {
        name: "is_deleted",
        type: "boolean",
        description: "Whether the product is deleted",
        example: "false",
      },
      {
        name: "is_revenue",
        type: "boolean",
        description: "Whether the product generates revenue",
        example: "true",
      },
      {
        name: "is_discountable",
        type: "boolean",
        description: "Whether the product can be discounted",
        example: "true",
      },
      {
        name: "stock_count",
        type: "integer",
        description: "Current stock count",
        example: "50",
      },
      {
        name: "auto_manage_stock",
        type: "boolean",
        description: "Whether stock is automatically managed",
        example: "false",
      },
      {
        name: "unit_name",
        type: "text",
        description: "Unit name for the product",
        example: "each",
      },
      {
        name: "unit_of_measure",
        type: "text",
        description: "Unit of measurement",
        example: "piece",
      },
      {
        name: "calories",
        type: "integer",
        description: "Calorie content",
        example: "650",
      },
      {
        name: "weight",
        type: "numeric(10,2)",
        description: "Product weight",
        example: "0.25",
      },
      {
        name: "weight_unit_of_measure",
        type: "text",
        description: "Weight unit of measurement",
        example: "kg",
      },
      {
        name: "length",
        type: "numeric(10,2)",
        description: "Product length",
        example: "15.00",
      },
      {
        name: "width",
        type: "numeric(10,2)",
        description: "Product width",
        example: "10.00",
      },
      {
        name: "height",
        type: "numeric(10,2)",
        description: "Product height",
        example: "5.00",
      },
      {
        name: "dimension_unit_of_measure",
        type: "text",
        description: "Dimension unit of measurement",
        example: "cm",
      },
      {
        name: "image_url",
        type: "text",
        description: "URL to product image",
        example: "https://example.com/burger.jpg",
      },
      {
        name: "color_code",
        type: "text",
        description: "Color code for the product",
        example: "#FF5733",
      },
      {
        name: "pos_name",
        type: "text",
        description: "Name displayed on POS",
        example: "Classic Burger",
      },
      {
        name: "pos_button_color_light",
        type: "text",
        description: "POS button color for light theme",
        example: "#FFFFFF",
      },
      {
        name: "pos_button_color_dark",
        type: "text",
        description: "POS button color for dark theme",
        example: "#000000",
      },
      {
        name: "sort_order",
        type: "integer",
        description: "Sort order for display",
        example: "1",
      },
      {
        name: "default_tax_rates",
        type: "boolean",
        description: "Whether to use default tax rates",
        example: "true",
      },
      {
        name: "tax_inclusion",
        type: "text",
        description: "Tax inclusion type",
        example: "inclusive",
      },
      {
        name: "prep_time",
        type: "integer",
        description: "Preparation time in minutes",
        example: "15",
      },
      {
        name: "prep_stations",
        type: "jsonb",
        description: "Preparation stations information",
        example: '["grill", "assembly"]',
      },
      {
        name: "variations",
        type: "jsonb",
        description: "Product variations",
        example: '{"size": ["small", "large"]}',
      },
      {
        name: "modifiers",
        type: "jsonb",
        description: "Product modifiers",
        example: '[{"name": "Extra Cheese", "price": 1.50}]',
      },
      {
        name: "modifier_groups",
        type: "jsonb",
        description: "Modifier groups",
        example: '[{"name": "Toppings", "required": false}]',
      },
      {
        name: "options",
        type: "jsonb",
        description: "Product options",
        example: '{"spicy": true, "vegetarian": false}',
      },
      {
        name: "categories",
        type: "jsonb",
        description: "Product categories",
        example: '["burgers", "mains"]',
      },
      {
        name: "tags",
        type: "jsonb",
        description: "Product tags",
        example: '["popular", "bestseller"]',
      },
      {
        name: "tax_rates",
        type: "jsonb",
        description: "Tax rates information",
        example: '{"rate": 0.08, "type": "sales_tax"}',
      },
      {
        name: "images",
        type: "jsonb",
        description: "Product images",
        example: '[{"url": "image1.jpg", "alt": "Burger"}]',
      },
      {
        name: "allergens",
        type: "jsonb",
        description: "Allergen information",
        example: '["gluten", "dairy"]',
      },
      {
        name: "content_advisories",
        type: "jsonb",
        description: "Content advisories",
        example: '["contains_nuts"]',
      },
      {
        name: "platform_data",
        type: "jsonb",
        description: "Platform-specific data",
        example: '{"toast_id": "12345"}',
      },
      {
        name: "created_date",
        type: "timestamptz",
        description: "When the product was created in the POS system",
        example: "2025-09-15T10:00:00+00:00",
      },
      {
        name: "modified_date",
        type: "timestamptz",
        description: "When the product was last modified in the POS system",
        example: "2025-09-16T14:30:00+00:00",
      },
      {
        name: "deleted_date",
        type: "timestamptz",
        description: "When the product was deleted",
        example: "2025-09-17T09:00:00+00:00",
      },
      {
        name: "created_at",
        type: "timestamptz",
        description: "When the record was created in our system",
        example: "2025-09-16T09:01:06.709666+00:00",
      },
      {
        name: "updated_at",
        type: "timestamptz",
        description: "When the record was last updated in our system",
        example: "2025-09-16T09:01:06.709666+00:00",
      },
      {
        name: "calculated_food_cost",
        type: "numeric(10,2)",
        description: "Calculated food cost based on ingredients",
        example: "4.25",
      },
      {
        name: "type",
        type: "text",
        description: "Product type (product or ingredient)",
        example: "product",
      },
      {
        name: "opening_stock",
        type: "numeric(10,2)",
        description: "Opening stock quantity",
        example: "100.00",
      },
    ],
  },

  shifts: {
    name: "shifts",
    description: "Employee shift schedules from Toast, Square, Clover, and 7shifts systems",
    fields: [
      {
        name: "id",
        type: "uuid",
        description: "Unique identifier for the shift",
        example: "750e8400-e29b-41d4-a716-446655440044",
      },
      {
        name: "platform",
        type: "text",
        description: "Platform that created the shift record",
        example: "7shifts",
      },
      {
        name: "platform_shift_id",
        type: "text",
        description: "Original shift ID from the platform",
        example: "shift_001",
      },
      {
        name: "user_id",
        type: "uuid",
        description: "Reference to the employee",
        example: "450e8400-e29b-41d4-a716-446655440033",
      },
      {
        name: "location_id",
        type: "uuid",
        description: "Reference to the restaurant location",
        example: "550e8400-e29b-41d4-a716-446655440000",
      },
      {
        name: "start_time",
        type: "timestamptz",
        description: "Scheduled start time",
        example: "2025-09-17T09:00:00+00:00",
      },
      {
        name: "end_time",
        type: "timestamptz",
        description: "Scheduled end time",
        example: "2025-09-17T17:00:00+00:00",
      },
      {
        name: "actual_start_time",
        type: "timestamptz",
        description: "Actual clock-in time",
        example: "2025-09-17T08:55:00+00:00",
      },
      {
        name: "actual_end_time",
        type: "timestamptz",
        description: "Actual clock-out time",
        example: "2025-09-17T17:10:00+00:00",
      },
      {
        name: "status",
        type: "text",
        description: "Shift status",
        example: "completed",
      },
      {
        name: "role_id",
        type: "text",
        description: "Role for this shift",
        example: "server",
      },
      {
        name: "is_published",
        type: "boolean",
        description: "Whether the shift is published",
        example: "true",
      },
      {
        name: "created_at",
        type: "timestamptz",
        description: "When the record was created in our system",
        example: "2025-09-16T09:01:06.709666+00:00",
      },
      {
        name: "updated_at",
        type: "timestamptz",
        description: "When the record was last updated in our system",
        example: "2025-09-16T09:01:06.709666+00:00",
      },
    ],
  },

  tasks: {
    name: "tasks",
    description: "Task management and training assignments from 7shifts and other systems",
    fields: [
      {
        name: "id",
        type: "uuid",
        description: "Unique identifier for the task",
        example: "850e8400-e29b-41d4-a716-446655440055",
      },
      {
        name: "platform",
        type: "text",
        description: "Platform that created the task",
        example: "7shifts",
      },
      {
        name: "platform_task_id",
        type: "text",
        description: "Original task ID from the platform",
        example: "task_001",
      },
      {
        name: "title",
        type: "text",
        description: "Task title",
        example: "Clean dining area",
      },
      {
        name: "description",
        type: "text",
        description: "Task description",
        example: "Wipe down all tables and chairs in dining area",
      },
      {
        name: "status",
        type: "text",
        description: "Task status",
        example: "completed",
      },
      {
        name: "priority",
        type: "text",
        description: "Task priority",
        example: "high",
      },
      {
        name: "assigned_to",
        type: "uuid",
        description: "Employee assigned to the task",
        example: "450e8400-e29b-41d4-a716-446655440033",
      },
      {
        name: "location_id",
        type: "uuid",
        description: "Reference to the restaurant location",
        example: "550e8400-e29b-41d4-a716-446655440000",
      },
      {
        name: "due_time",
        type: "timestamptz",
        description: "When the task is due",
        example: "2025-09-17T12:00:00+00:00",
      },
      {
        name: "completed_at",
        type: "timestamptz",
        description: "When the task was completed",
        example: "2025-09-17T11:45:00+00:00",
      },
      {
        name: "created_at",
        type: "timestamptz",
        description: "When the record was created in our system",
        example: "2025-09-16T09:01:06.709666+00:00",
      },
      {
        name: "updated_at",
        type: "timestamptz",
        description: "When the record was last updated in our system",
        example: "2025-09-16T09:01:06.709666+00:00",
      },
    ],
  },

  inventory: {
    name: "inventory",
    description: "Inventory levels and stock management from Clover and other systems",
    fields: [
      {
        name: "id",
        type: "uuid",
        description: "Unique identifier for the inventory item",
        example: "950e8400-e29b-41d4-a716-446655440066",
      },
      {
        name: "platform",
        type: "text",
        description: "Platform that manages this inventory",
        example: "clover",
      },
      {
        name: "platform_inventory_id",
        type: "text",
        description: "Original inventory ID from the platform",
        example: "inv_001",
      },
      {
        name: "product_id",
        type: "uuid",
        description: "Reference to the product",
        example: "650e8400-e29b-41d4-a716-446655440000",
      },
      {
        name: "name",
        type: "text",
        description: "Inventory item name",
        example: "Burger Patties",
      },
      {
        name: "sku",
        type: "text",
        description: "Stock Keeping Unit identifier",
        example: "PATTY-BEEF-001",
      },
      {
        name: "stock_count",
        type: "integer",
        description: "Current stock count",
        example: "50",
      },
      {
        name: "quantity",
        type: "numeric(10,2)",
        description: "Current quantity",
        example: "50.00",
      },
      {
        name: "reorder_threshold",
        type: "integer",
        description: "Minimum stock level before reordering",
        example: "10",
      },
      {
        name: "reorder_quantity",
        type: "integer",
        description: "Quantity to reorder",
        example: "100",
      },
      {
        name: "unit_name",
        type: "text",
        description: "Unit of measure name",
        example: "pieces",
      },
      {
        name: "is_available",
        type: "boolean",
        description: "Whether the item is available",
        example: "true",
      },
      {
        name: "cost",
        type: "numeric(10,2)",
        description: "Cost per unit",
        example: "2.50",
      },
      {
        name: "location_id",
        type: "uuid",
        description: "Reference to the restaurant location",
        example: "550e8400-e29b-41d4-a716-446655440000",
      },
      {
        name: "created_at",
        type: "timestamptz",
        description: "When the record was created in our system",
        example: "2025-09-16T09:01:06.709666+00:00",
      },
      {
        name: "updated_at",
        type: "timestamptz",
        description: "When the record was last updated in our system",
        example: "2025-09-16T09:01:06.709666+00:00",
      },
    ],
  },

  locations: {
    name: "locations",
    description: "Restaurant location information and integration settings",
    fields: [
      {
        name: "id",
        type: "uuid",
        description: "Unique identifier for the location",
        example: "550e8400-e29b-41d4-a716-446655440000",
      },
      {
        name: "user_id",
        type: "uuid",
        description: "Reference to the owner/manager user",
        example: "450e8400-e29b-41d4-a716-446655440033",
      },
      {
        name: "name",
        type: "varchar(255)",
        description: "Location name",
        example: "Downtown Restaurant",
      },
      {
        name: "address",
        type: "text",
        description: "Street address",
        example: "123 Main Street",
      },
      {
        name: "city",
        type: "text",
        description: "City",
        example: "New York",
      },
      {
        name: "state",
        type: "text",
        description: "State or province",
        example: "NY",
      },
      {
        name: "postal_code",
        type: "text",
        description: "Postal code",
        example: "10001",
      },
      {
        name: "country",
        type: "text",
        description: "Country",
        example: "United States",
      },
      {
        name: "phone",
        type: "text",
        description: "Location phone number",
        example: "+1-555-123-4567",
      },
      {
        name: "email",
        type: "text",
        description: "Location email address",
        example: "downtown@restaurant.com",
      },
      {
        name: "timezone",
        type: "text",
        description: "Location timezone",
        example: "America/New_York",
      },
      {
        name: "currency",
        type: "text",
        description: "Default currency",
        example: "USD",
      },
      {
        name: "is_active",
        type: "boolean",
        description: "Whether the location is active",
        example: "true",
      },
      {
        name: "created_at",
        type: "timestamptz",
        description: "When the record was created in our system",
        example: "2025-09-16T09:01:06.709666+00:00",
      },
      {
        name: "updated_at",
        type: "timestamptz",
        description: "When the record was last updated in our system",
        example: "2025-09-16T09:01:06.709666+00:00",
      },
    ],
  },

  integrations: {
    name: "integrations",
    description: "Integration configurations for POS systems, scheduling tools, and other restaurant management platforms",
    fields: [
      {
        name: "id",
        type: "uuid",
        description: "Unique identifier for the integration",
        example: "a50e8400-e29b-41d4-a716-446655440077",
      },
      {
        name: "location_id",
        type: "uuid",
        description: "Reference to the restaurant location",
        example: "550e8400-e29b-41d4-a716-446655440000",
      },
      {
        name: "integration_type",
        type: "varchar(50)",
        description: "Type of integration",
        example: "posSystem",
      },
      {
        name: "provider_type",
        type: "varchar(50)",
        description: "Provider of the integration",
        example: "toast",
      },
      {
        name: "api_key_hash",
        type: "text",
        description: "Hashed API key for security",
        example: "hash_abc123def456",
      },
      {
        name: "connection_status",
        type: "varchar(20)",
        description: "Current connection status",
        example: "Connected",
      },
      {
        name: "settings",
        type: "jsonb",
        description: "Integration-specific settings",
        example: '{"sync_frequency": "hourly", "auto_sync": true}',
      },
      {
        name: "last_sync_at",
        type: "timestamptz",
        description: "When the last sync occurred",
        example: "2025-09-17T11:00:00+00:00",
      },
      {
        name: "created_at",
        type: "timestamptz",
        description: "When the record was created in our system",
        example: "2025-09-16T09:01:06.709666+00:00",
      },
      {
        name: "updated_at",
        type: "timestamptz",
        description: "When the record was last updated in our system",
        example: "2025-09-16T09:01:06.709666+00:00",
      },
    ],
  },
};

// Helper function to get structured schema for tables
export function getStructuredSchemaForTables(tableNames: string[]): Record<string, StructuredTableSchema> {
  const schemas: Record<string, StructuredTableSchema> = {};
  tableNames.forEach((tableName) => {
    // Try exact match first
    if (STRUCTURED_TABLE_SCHEMAS[tableName]) {
      schemas[tableName] = STRUCTURED_TABLE_SCHEMAS[tableName];
    } else {
      // Try case-insensitive match and title-to-name mapping
      const lowerTableName = tableName.toLowerCase();

      // Map common title variations to actual table names
      const titleToNameMap: Record<string, string> = {
        orders: "orders",
        customers: "customers",
        users: "users",
        "users/employees": "users",
        products: "products",
        "products/menu items": "products",
        shifts: "shifts",
        "employee shifts": "shifts",
        tasks: "tasks",
        "tasks & training": "tasks",
        inventory: "inventory",
        locations: "locations",
        "restaurant locations": "locations",
        integrations: "integrations",
        "system integrations": "integrations",
        payments: "payments",
      };

      const actualTableName = titleToNameMap[lowerTableName];
      if (actualTableName && STRUCTURED_TABLE_SCHEMAS[actualTableName]) {
        schemas[actualTableName] = STRUCTURED_TABLE_SCHEMAS[actualTableName];
      }
    }
  });
  return schemas;
}
