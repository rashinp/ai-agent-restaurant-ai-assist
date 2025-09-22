import { executeQuery } from "./database";

export const insertSampleData = async () => {
  try {
    console.log("Inserting sample restaurant data...");

    // Insert sample customers
    await executeQuery(`
      INSERT INTO customers (name, email, phone, registration_date) VALUES
      ('John Smith', 'john.smith@email.com', '+1234567890', '2024-01-15'),
      ('Sarah Johnson', 'sarah.j@email.com', '+1234567891', '2024-02-20'),
      ('Mike Brown', 'mike.brown@email.com', '+1234567892', '2024-03-10'),
      ('Emily Davis', 'emily.davis@email.com', '+1234567893', '2024-01-25'),
      ('David Wilson', 'david.w@email.com', '+1234567894', '2024-02-05')
      ON CONFLICT (email) DO NOTHING
    `);

    // Insert sample menu items
    await executeQuery(`
      INSERT INTO menu_items (name, price, category, availability, description) VALUES
      ('Margherita Pizza', 18.99, 'Pizza', true, 'Classic pizza with tomato sauce, mozzarella, and basil'),
      ('Caesar Salad', 12.99, 'Salads', true, 'Romaine lettuce with caesar dressing and croutons'),
      ('Grilled Salmon', 24.99, 'Main Course', true, 'Fresh Atlantic salmon with herbs'),
      ('Chocolate Cake', 8.99, 'Desserts', true, 'Rich chocolate cake with vanilla ice cream'),
      ('Pepperoni Pizza', 21.99, 'Pizza', true, 'Pizza with pepperoni and mozzarella cheese'),
      ('Greek Salad', 13.99, 'Salads', true, 'Mixed greens with feta, olives, and tomatoes'),
      ('Chicken Alfredo', 19.99, 'Main Course', true, 'Pasta with grilled chicken in alfredo sauce'),
      ('Tiramisu', 9.99, 'Desserts', true, 'Classic Italian dessert')
      ON CONFLICT DO NOTHING
    `);

    // Insert sample staff
    await executeQuery(`
      INSERT INTO staff (name, role, hire_date, salary, status) VALUES
      ('Alice Manager', 'Manager', '2023-01-01', 55000, 'active'),
      ('Bob Chef', 'Head Chef', '2023-02-15', 48000, 'active'),
      ('Carol Server', 'Server', '2023-06-01', 35000, 'active'),
      ('Dan Server', 'Server', '2023-08-15', 33000, 'active'),
      ('Eve Cook', 'Line Cook', '2023-09-01', 38000, 'active')
      ON CONFLICT DO NOTHING
    `);

    // Insert sample orders (recent data)
    const orderData = [];
    const customerIds = [1, 2, 3, 4, 5];
    const currentDate = new Date();

    for (let i = 0; i < 50; i++) {
      const daysAgo = Math.floor(Math.random() * 30); // Last 30 days
      const orderDate = new Date(currentDate);
      orderDate.setDate(orderDate.getDate() - daysAgo);
      orderDate.setHours(Math.floor(Math.random() * 12) + 11); // 11 AM to 11 PM

      const customerId = customerIds[Math.floor(Math.random() * customerIds.length)];
      const totalAmount = (Math.random() * 80 + 20).toFixed(2); // $20 - $100
      const tableNumber = Math.floor(Math.random() * 20) + 1;

      orderData.push(`(${customerId}, ${totalAmount}, '${orderDate.toISOString()}', 'completed', ${tableNumber})`);
    }

    await executeQuery(`
      INSERT INTO orders (customer_id, total_amount, order_date, status, table_number) VALUES
      ${orderData.join(", ")}
      ON CONFLICT DO NOTHING
    `);

    // Insert sample order items
    const orders = await executeQuery("SELECT order_id FROM orders ORDER BY order_id");
    const menuItems = await executeQuery("SELECT item_id, price FROM menu_items");

    for (const order of orders.slice(0, 30)) {
      // Add items for first 30 orders
      const numItems = Math.floor(Math.random() * 4) + 1; // 1-4 items per order
      const selectedItems = [];

      for (let i = 0; i < numItems; i++) {
        const menuItem = menuItems[Math.floor(Math.random() * menuItems.length)];
        const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 quantity
        selectedItems.push(`(${order.order_id}, ${menuItem.item_id}, ${quantity}, ${menuItem.price})`);
      }

      if (selectedItems.length > 0) {
        await executeQuery(`
          INSERT INTO order_items (order_id, item_id, quantity, unit_price) VALUES
          ${selectedItems.join(", ")}
          ON CONFLICT DO NOTHING
        `);
      }
    }

    // Insert sample inventory
    await executeQuery(`
      INSERT INTO inventory (item_name, quantity, unit, cost_per_unit, supplier, last_updated) VALUES
      ('Tomatoes', 50.5, 'lbs', 3.50, 'Fresh Farm Supplies', CURRENT_TIMESTAMP),
      ('Mozzarella Cheese', 25.0, 'lbs', 8.99, 'Dairy Direct', CURRENT_TIMESTAMP),
      ('Salmon Fillets', 15.0, 'lbs', 18.50, 'Ocean Fresh', CURRENT_TIMESTAMP),
      ('Chicken Breast', 30.0, 'lbs', 6.99, 'Poultry Plus', CURRENT_TIMESTAMP),
      ('Pasta', 40.0, 'lbs', 2.25, 'Italian Imports', CURRENT_TIMESTAMP),
      ('Olive Oil', 10.0, 'gallons', 25.00, 'Mediterranean Co', CURRENT_TIMESTAMP)
      ON CONFLICT DO NOTHING
    `);

    // Insert sample reservations
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    await executeQuery(`
      INSERT INTO reservations (customer_id, table_number, reservation_date, reservation_time, party_size, status) VALUES
      (1, 5, '${futureDate.toISOString().split("T")[0]}', '19:00:00', 4, 'confirmed'),
      (2, 8, '${futureDate.toISOString().split("T")[0]}', '18:30:00', 2, 'confirmed'),
      (3, 12, '${futureDate.toISOString().split("T")[0]}', '20:00:00', 6, 'confirmed')
      ON CONFLICT DO NOTHING
    `);

    // Insert sample daily sales data
    for (let i = 0; i < 30; i++) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() - i);
      const dailySales = (Math.random() * 2000 + 1000).toFixed(2); // $1000-3000
      const orderCount = Math.floor(Math.random() * 40) + 20; // 20-60 orders
      const avgOrderValue = (parseFloat(dailySales) / orderCount).toFixed(2);
      const peakHour = Math.floor(Math.random() * 3) + 18; // 6-8 PM peak

      await executeQuery(`
        INSERT INTO sales_daily (date, total_sales, order_count, average_order_value, peak_hour) VALUES
        ('${date.toISOString().split("T")[0]}', ${dailySales}, ${orderCount}, ${avgOrderValue}, ${peakHour})
        ON CONFLICT (date) DO UPDATE SET
        total_sales = EXCLUDED.total_sales,
        order_count = EXCLUDED.order_count,
        average_order_value = EXCLUDED.average_order_value,
        peak_hour = EXCLUDED.peak_hour
      `);
    }

    console.log("Sample data inserted successfully!");
  } catch (error) {
    console.error("Error inserting sample data:", error);
    throw error;
  }
};
