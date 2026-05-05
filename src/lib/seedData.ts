import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from './firebase.ts';

const CATEGORIES = [
  { name: 'Fresh Juices', icon: '🧃', sortOrder: 1 },
  { name: 'Hot Beverages', icon: '☕', sortOrder: 2 },
  { name: 'Cold Beverages', icon: '🥤', sortOrder: 3 },
  { name: 'Starters & Quick Bites', icon: '🍟', sortOrder: 4 },
  { name: 'Sandwiches', icon: '🥪', sortOrder: 5 },
  { name: 'Burgers', icon: '🍔', sortOrder: 6 },
  { name: 'Pasta', icon: '🍝', sortOrder: 7 },
  { name: 'Cakes & Special Cakes', icon: '🍰', sortOrder: 8 },
  { name: 'Desserts & Sweet Treats', icon: '🍨', sortOrder: 9 },
];

const ITEMS = [
  // Fresh Juices
  { name: 'Mango Juice', price: 60, category: 'Fresh Juices', available: true },
  { name: 'Pineapple Juice', price: 80, category: 'Fresh Juices', available: true },
  { name: 'Apple Juice', price: 80, category: 'Fresh Juices', available: true },
  { name: 'Watermelon Juice', price: 60, category: 'Fresh Juices', available: true },
  { name: 'Muskmelon Juice', price: 60, category: 'Fresh Juices', available: true },
  { name: 'Orange Juice', price: 80, category: 'Fresh Juices', available: true },
  { name: 'Pomegranate Juice', price: 90, category: 'Fresh Juices', available: true },
  { name: 'Papaya Juice', price: 90, category: 'Fresh Juices', available: true },
  { name: 'Mosambi Juice', price: 60, category: 'Fresh Juices', available: true },
  { name: 'Grapes Juice', price: 80, category: 'Fresh Juices', available: true },
  
  // Hot Beverages
  { name: 'Tea', price: 20, category: 'Hot Beverages', available: true },
  { name: 'Coffee', price: 25, category: 'Hot Beverages', available: true },
  { name: 'Hot Chocolate', price: 110, category: 'Hot Beverages', available: true },
  
  // Cold Beverages
  { name: 'Cold Coffee', price: 100, category: 'Cold Beverages', available: true },
  { name: 'Cold Coffee with Ice Cream', price: 130, category: 'Cold Beverages', available: true },
  { name: 'Lemon Ice Tea', price: 70, category: 'Cold Beverages', available: true },
  { name: 'Peach Ice Tea', price: 90, category: 'Cold Beverages', available: true },
  { name: 'Chocolate Frappe', price: 110, category: 'Cold Beverages', available: true },

  // Starters & Quick Bites
  { name: 'French Fries', price: 80, category: 'Starters & Quick Bites', available: true },
  { name: 'Peri Peri Fries', price: 90, category: 'Starters & Quick Bites', available: true },
  { name: 'Cheesy Fries', price: 99, category: 'Starters & Quick Bites', available: true },
  { name: 'Loaded Chicken Fries', price: 120, category: 'Starters & Quick Bites', available: true },
  { name: 'Smiley Fries', price: 60, category: 'Starters & Quick Bites', available: true },
  { name: 'Potato Wedges', price: 80, category: 'Starters & Quick Bites', available: true },
  { name: 'Cheese Balls', price: 110, category: 'Starters & Quick Bites', available: true },
  { name: 'Bread Omelette', price: 40, category: 'Starters & Quick Bites', available: true },
  { name: 'Cheese Bread Omelette', price: 60, category: 'Starters & Quick Bites', available: true },
  { name: 'Crispy Chicken Roll', price: 110, category: 'Starters & Quick Bites', available: true },

  // Sandwiches
  { name: 'Chicken Sandwich', price: 110, category: 'Sandwiches', available: true },
  { name: 'Sweet Corn Sandwich', price: 90, category: 'Sandwiches', available: true },
  { name: 'Paneer Sandwich', price: 100, category: 'Sandwiches', available: true },
  { name: 'Crispy Chicken Sandwich', price: 110, category: 'Sandwiches', available: true },
  { name: 'Peri Peri Chicken Sandwich', price: 120, category: 'Sandwiches', available: true },

  // Burgers
  { name: 'Crispy Chicken Burger', price: 99, category: 'Burgers', available: true },
  { name: 'Peri Peri Crispy Chicken Burger', price: 110, category: 'Burgers', available: true },

  // Pasta
  { name: 'White Sauce Pasta (Veg)', price: 90, category: 'Pasta', available: true },
  { name: 'White Sauce Pasta (Non-Veg)', price: 110, category: 'Pasta', available: true },
  { name: 'Red Sauce Pasta (Veg)', price: 90, category: 'Pasta', available: true },
  { name: 'Red Sauce Pasta (Non-Veg)', price: 100, category: 'Pasta', available: true },
  { name: 'Pink Sauce Pasta (Veg)', price: 90, category: 'Pasta', available: true },
  { name: 'Pink Sauce Pasta (Non-Veg)', price: 110, category: 'Pasta', available: true },

  // Cakes
  { name: 'Vanilla Cake (Full)', price: 300, category: 'Cakes & Special Cakes', available: true },
  { name: 'Dream Cake', price: 300, category: 'Cakes & Special Cakes', available: true },
  { name: 'Black Forest', price: 350, category: 'Cakes & Special Cakes', available: true },
  { name: 'Red Velvet Cream Cheese', price: 550, category: 'Cakes & Special Cakes', available: true },
  { name: 'Custom Design Cake', price: 1300, category: 'Cakes & Special Cakes', available: true },

  // Desserts
  { name: 'Brownie Plain', price: 80, category: 'Desserts & Sweet Treats', available: true },
  { name: 'Death by Chocolate Brownie', price: 110, category: 'Desserts & Sweet Treats', available: true },
  { name: 'Brownie with Ice Cream', price: 120, category: 'Desserts & Sweet Treats', available: true },
  { name: 'Sizzling Brownie', price: 150, category: 'Desserts & Sweet Treats', available: true },
  { name: 'Chocolate Mousse', price: 120, category: 'Desserts & Sweet Treats', available: true },
  { name: 'Donuts', price: 50, category: 'Desserts & Sweet Treats', available: true },
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
