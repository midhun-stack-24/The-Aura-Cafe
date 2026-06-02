import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { db } from './firebase.ts';

const CATEGORIES = [
  { name: 'Cakes', icon: '🍰', sortOrder: 1 },
  { name: 'Snacks & Sides', icon: '🍟', sortOrder: 2 },
  { name: 'Burgers', icon: '🍔', sortOrder: 3 },
  { name: 'Sandwiches', icon: '🥪', sortOrder: 4 },
  { name: 'Desserts', icon: '🍨', sortOrder: 5 },
  { name: 'Pasta', icon: '🍝', sortOrder: 6 },
  { name: 'Hot Beverages', icon: '☕', sortOrder: 7 },
  { name: 'Cold Beverages', icon: '🥤', sortOrder: 8 },
  { name: 'Fresh Juices', icon: '🧃', sortOrder: 9 },
  { name: 'Frappes', icon: '🍦', sortOrder: 10 },
  { name: 'Avil Milk', icon: '🥛', sortOrder: 11 },
  { name: 'Mojito', icon: '🍹', sortOrder: 12 },
];

const ITEMS = [
  // Cakes
  { name: 'Vanilla Cake (0.5kg)', price: 350, category: 'Cakes', available: true },
  { name: 'Vanilla Cake (1kg)', price: 650, category: 'Cakes', available: true },
  { name: 'Black Forest Cake (0.5kg)', price: 375, category: 'Cakes', available: true },
  { name: 'Black Forest Cake (1kg)', price: 700, category: 'Cakes', available: true },
  { name: 'Butterscotch Cake (0.5kg)', price: 400, category: 'Cakes', available: true },
  { name: 'Butterscotch Cake (1kg)', price: 750, category: 'Cakes', available: true },
  { name: 'Black Currant Cake (0.5kg)', price: 400, category: 'Cakes', available: true },
  { name: 'Black Currant Cake (1kg)', price: 750, category: 'Cakes', available: true },
  { name: 'Pineapple Cake (0.5kg)', price: 400, category: 'Cakes', available: true },
  { name: 'Pineapple Cake (1kg)', price: 750, category: 'Cakes', available: true },
  { name: 'Strawberry Cake (0.5kg)', price: 400, category: 'Cakes', available: true },
  { name: 'Strawberry Cake (1kg)', price: 800, category: 'Cakes', available: true },
  { name: 'White Forest Cake (0.5kg)', price: 450, category: 'Cakes', available: true },
  { name: 'White Forest Cake (1kg)', price: 850, category: 'Cakes', available: true },
  { name: 'Mango Cake (0.5kg)', price: 450, category: 'Cakes', available: true },
  { name: 'Mango Cake (1kg)', price: 900, category: 'Cakes', available: true },
  { name: 'Kit Kat Cake (0.5kg)', price: 450, category: 'Cakes', available: true },
  { name: 'Kit Kat Cake (1kg)', price: 850, category: 'Cakes', available: true },
  { name: 'Oreo Cake (0.5kg)', price: 450, category: 'Cakes', available: true },
  { name: 'Oreo Cake (1kg)', price: 850, category: 'Cakes', available: true },
  { name: 'Heavenly Chocolate Cake (0.5kg)', price: 550, category: 'Cakes', available: true },
  { name: 'Heavenly Chocolate Cake (1kg)', price: 1100, category: 'Cakes', available: true },
  { name: 'Rocher Cake (0.5kg)', price: 550, category: 'Cakes', available: true },
  { name: 'Rocher Cake (1kg)', price: 1100, category: 'Cakes', available: true },
  { name: 'Blueberry Cake (0.5kg)', price: 550, category: 'Cakes', available: true },
  { name: 'Blueberry Cake (1kg)', price: 1100, category: 'Cakes', available: true },
  { name: 'Dark Truffle Cake (0.5kg)', price: 600, category: 'Cakes', available: true },
  { name: 'Dark Truffle Cake (1kg)', price: 1200, category: 'Cakes', available: true },
  { name: 'Roasted Almond Cake (0.5kg)', price: 600, category: 'Cakes', available: true },
  { name: 'Roasted Almond Cake (1kg)', price: 1200, category: 'Cakes', available: true },
  { name: 'Fresh Fruit Cake (0.5kg)', price: 700, category: 'Cakes', available: true },
  { name: 'Fresh Fruit Cake (1kg)', price: 1400, category: 'Cakes', available: true },
  { name: 'Milk Truffle Cake (0.5kg)', price: 700, category: 'Cakes', available: true },
  { name: 'Milk Truffle Cake (1kg)', price: 1400, category: 'Cakes', available: true },

  // Snacks & Sides
  { name: 'Bread Omelette', price: 40, category: 'Snacks & Sides', available: true },
  { name: 'Smiley Fries', price: 60, category: 'Snacks & Sides', available: true },
  { name: 'Cheese Bread Omelette', price: 60, category: 'Snacks & Sides', available: true },
  { name: 'French Fries', price: 80, category: 'Snacks & Sides', available: true },
  { name: 'Potato Wedges', price: 80, category: 'Snacks & Sides', available: true },
  { name: 'Peri Peri Fries', price: 90, category: 'Snacks & Sides', available: true },
  { name: 'Cheese Balls', price: 110, category: 'Snacks & Sides', available: true },
  { name: 'Crispy Chicken Roll', price: 110, category: 'Snacks & Sides', available: true },
  { name: 'Loaded Chicken Fries', price: 140, category: 'Snacks & Sides', available: true },

  // Burgers
  { name: 'Chicken Burger', price: 99, category: 'Burgers', available: true },
  { name: 'Crispy Chicken Burger', price: 99, category: 'Burgers', available: true },
  { name: 'Peri Peri Crispy Burger', price: 110, category: 'Burgers', available: true },

  // Sandwiches
  { name: 'Sweet Corn Sandwich', price: 90, category: 'Sandwiches', available: true },
  { name: 'Paneer Sandwich', price: 100, category: 'Sandwiches', available: true },
  { name: 'Chicken Sandwich', price: 110, category: 'Sandwiches', available: true },
  { name: 'Crispy Chicken Sandwich', price: 110, category: 'Sandwiches', available: true },
  { name: 'Peri Peri Chicken Sandwich', price: 120, category: 'Sandwiches', available: true },

  // Desserts
  { name: 'Plain Brownie', price: 80, category: 'Desserts', available: true },
  { name: 'Choco Brownie', price: 100, category: 'Desserts', available: true },
  { name: 'Nutty Brownie', price: 110, category: 'Desserts', available: true },
  { name: 'Brownie with Ice Cream', price: 130, category: 'Desserts', available: true },
  { name: 'Sizzling Brownie', price: 170, category: 'Desserts', available: true },
  { name: 'Choco Lava', price: 70, category: 'Desserts', available: true },

  // Pasta
  { name: 'Red Sauce Pasta Veg', price: 80, category: 'Pasta', available: true },
  { name: 'Red Sauce Pasta Non-Veg', price: 100, category: 'Pasta', available: true },
  { name: 'White Sauce Pasta Veg', price: 90, category: 'Pasta', available: true },
  { name: 'White Sauce Pasta Non-Veg', price: 110, category: 'Pasta', available: true },
  { name: 'Pink Sauce Pasta Veg', price: 90, category: 'Pasta', available: true },
  { name: 'Pink Sauce Pasta Non-Veg', price: 110, category: 'Pasta', available: true },

  // Hot Beverages
  { name: 'Tea', price: 20, category: 'Hot Beverages', available: true },
  { name: 'Coffee', price: 25, category: 'Hot Beverages', available: true },
  { name: 'Hot Chocolate', price: 110, category: 'Hot Beverages', available: true },

  // Cold Beverages
  { name: 'Lemon Ice Tea', price: 70, category: 'Cold Beverages', available: true },
  { name: 'Peach Ice Tea', price: 90, category: 'Cold Beverages', available: true },
  { name: 'Cold Coffee', price: 100, category: 'Cold Beverages', available: true },
  { name: 'Cold Coffee + Ice Cream', price: 130, category: 'Cold Beverages', available: true },

  // Fresh Juices
  { name: 'Watermelon', price: 60, category: 'Fresh Juices', available: true },
  { name: 'Papaya', price: 60, category: 'Fresh Juices', available: true },
  { name: 'Pineapple', price: 70, category: 'Fresh Juices', available: true },
  { name: 'Musambi', price: 70, category: 'Fresh Juices', available: true },
  { name: 'Muskmelon', price: 70, category: 'Fresh Juices', available: true },
  { name: 'Orange', price: 80, category: 'Fresh Juices', available: true },
  { name: 'Mango', price: 80, category: 'Fresh Juices', available: true },
  { name: 'Grapes', price: 80, category: 'Fresh Juices', available: true },
  { name: 'Apple', price: 90, category: 'Fresh Juices', available: true },
  { name: 'Pomegranate', price: 90, category: 'Fresh Juices', available: true },

  // Frappes
  { name: 'Strawberry Frappe', price: 100, category: 'Frappes', available: true },
  { name: 'Mango Frappe', price: 100, category: 'Frappes', available: true },
  { name: 'Chocolate Frappe', price: 110, category: 'Frappes', available: true },
  { name: 'Kit Kat Frappe', price: 110, category: 'Frappes', available: true },
  { name: 'Oreo Frappe', price: 120, category: 'Frappes', available: true },
  { name: 'Very Berry Frappe', price: 120, category: 'Frappes', available: true },
  { name: 'Brownie Frappe', price: 130, category: 'Frappes', available: true },
  { name: 'Biscoff Frappe', price: 150, category: 'Frappes', available: true },
  { name: 'Choco Overload Frappe', price: 160, category: 'Frappes', available: true },
  { name: 'Dry Fruit Frappe', price: 160, category: 'Frappes', available: true },

  // Avil Milk
  { name: 'Classic Avil Milk', price: 90, category: 'Avil Milk', available: true },
  { name: 'Special Avil Milk', price: 120, category: 'Avil Milk', available: true },
  { name: 'Sharjah', price: 90, category: 'Avil Milk', available: true },

  // Mojito
  { name: 'Mint', price: 80, category: 'Mojito', available: true },
  { name: 'Strawberry', price: 90, category: 'Mojito', available: true },
  { name: 'Green Apple', price: 100, category: 'Mojito', available: true },
  { name: 'Blue Curacao', price: 110, category: 'Mojito', available: true },
];

export const seedDatabase = async () => {
  try {
    const catSnap = await getDocs(collection(db, 'menuCategories'));
    if (!catSnap.empty) return; // Already seeded

    const catMap: Record<string, string> = {};

    for (const cat of CATEGORIES) {
      const docRef = await addDoc(collection(db, 'menuCategories'), cat);
      catMap[cat.name] = docRef.id;
    }

    for (const item of ITEMS) {
      await addDoc(collection(db, 'menuItems'), {
        ...item,
        categoryId: catMap[item.category]
      });
    }

    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
};

export const forceResetAndSeed = async () => {
  // 1. Delete all current menu items
  const itemsSnap = await getDocs(collection(db, 'menuItems'));
  for (const d of itemsSnap.docs) {
    await deleteDoc(doc(db, 'menuItems', d.id));
  }

  // 2. Delete all current menu categories
  const catsSnap = await getDocs(collection(db, 'menuCategories'));
  for (const d of catsSnap.docs) {
    await deleteDoc(doc(db, 'menuCategories', d.id));
  }

  // 3. Seed new ones
  const catMap: Record<string, string> = {};

  for (const cat of CATEGORIES) {
    const docRef = await addDoc(collection(db, 'menuCategories'), cat);
    catMap[cat.name] = docRef.id;
  }

  for (const item of ITEMS) {
    await addDoc(collection(db, 'menuItems'), {
      ...item,
      categoryId: catMap[item.category]
    });
  }
};
