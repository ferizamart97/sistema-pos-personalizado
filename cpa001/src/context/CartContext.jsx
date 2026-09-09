import { createContext, useReducer } from 'react';

export const CartContext = createContext(null);

function calculateItemPrice(basePrice, wholesaleTiers, quantity) {
  if (!wholesaleTiers || !Array.isArray(wholesaleTiers) || wholesaleTiers.length === 0) {
    return { unitPrice: basePrice, isWholesale: false, activeTier: null };
  }

  // Sort descending by min_quantity to match highest threshold first
  const sortedTiers = [...wholesaleTiers].sort((a, b) => parseFloat(b.min_quantity) - parseFloat(a.min_quantity));

  for (const tier of sortedTiers) {
    if (parseFloat(quantity) >= parseFloat(tier.min_quantity)) {
      return {
        unitPrice: parseFloat(tier.wholesale_price),
        isWholesale: true,
        activeTier: tier
      };
    }
  }

  return { unitPrice: basePrice, isWholesale: false, activeTier: null };
}

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const itemKey = action.payload.key || `${action.payload.item_type || 'producto'}-${action.payload.product_id || action.payload.package_id || action.payload.service_id}-${action.payload.fraction_id || 'base'}`;
      
      const existingIndex = state.findIndex(item => (item.key || `${item.item_type || 'producto'}-${item.product_id || item.package_id || item.service_id}-${item.fraction_id || 'base'}`) === itemKey);

      if (existingIndex > -1) {
        return state.map((item, idx) => {
          if (idx !== existingIndex) return item;
          const nextQty = item.quantity + (action.payload.quantity || 1);
          if (item.item_type === 'producto' && item.base_sale_price) {
            const { unitPrice, isWholesale, activeTier } = calculateItemPrice(item.base_sale_price, item.wholesale_tiers, nextQty);
            return {
              ...item,
              quantity: nextQty,
              unit_price: unitPrice,
              is_wholesale_applied: isWholesale,
              active_tier: activeTier
            };
          }
          return { ...item, quantity: nextQty };
        });
      }

      const initialQty = action.payload.quantity || 1;
      let initialUnitPrice = action.payload.unit_price;
      let isWholesale = false;
      let activeTier = null;

      if (action.payload.item_type === 'producto' && action.payload.base_sale_price) {
        const calculated = calculateItemPrice(action.payload.base_sale_price, action.payload.wholesale_tiers, initialQty);
        initialUnitPrice = calculated.unitPrice;
        isWholesale = calculated.isWholesale;
        activeTier = calculated.activeTier;
      }

      return [
        ...state,
        {
          ...action.payload,
          key: itemKey,
          quantity: initialQty,
          unit_price: initialUnitPrice,
          is_wholesale_applied: isWholesale,
          active_tier: activeTier
        }
      ];
    }

    case 'REMOVE_ITEM':
      return state.filter(item => (item.key || `${item.item_type || 'producto'}-${item.product_id || item.package_id || item.service_id}-${item.fraction_id || 'base'}`) !== action.payload);

    case 'UPDATE_QUANTITY':
      return state.map(item => {
        const itemKey = item.key || `${item.item_type || 'producto'}-${item.product_id || item.package_id || item.service_id}-${item.fraction_id || 'base'}`;
        if (itemKey !== action.payload.key) return item;

        const nextQty = Math.max(0.001, action.payload.quantity);
        if (item.item_type === 'producto' && item.base_sale_price) {
          const { unitPrice, isWholesale, activeTier } = calculateItemPrice(item.base_sale_price, item.wholesale_tiers, nextQty);
          return {
            ...item,
            quantity: nextQty,
            unit_price: unitPrice,
            is_wholesale_applied: isWholesale,
            active_tier: activeTier
          };
        }
        return { ...item, quantity: nextQty };
      });

    case 'CLEAR':
      return [];

    default:
      return state;
  }
};

export function CartProvider({ children }) {
  const [cartItems, dispatch] = useReducer(cartReducer, []);

  // Agregar Producto Normal
  const addToCart = (product, quantity = 1) => {
    const key = `producto-${product.id}-base`;
    const baseSalePrice = parseFloat(product.sale_price);
    const tiers = product.wholesale_tiers || [];
    const { unitPrice, isWholesale, activeTier } = calculateItemPrice(baseSalePrice, tiers, quantity);

    dispatch({
      type: 'ADD_ITEM',
      payload: {
        key,
        item_type: 'producto',
        product_id: product.id,
        name: product.name,
        base_sale_price: baseSalePrice,
        wholesale_tiers: tiers,
        unit_price: unitPrice,
        sale_price: unitPrice,
        is_wholesale_applied: isWholesale,
        active_tier: activeTier,
        image_url: product.image_url,
        quantity,
      },
    });
  };

  // Agregar a Granel por peso
  const addBulkToCart = (product, weight, unitPrice) => {
    const key = `granel-${product.id}-${weight}`;
    const pricePerUnit = parseFloat(unitPrice || product.bulk_price || product.sale_price);
    dispatch({
      type: 'ADD_ITEM',
      payload: {
        key,
        item_type: 'granel',
        product_id: product.id,
        name: `${product.name} (Granel ${weight} ${product.bulk_unit || 'kg'})`,
        unit_price: pricePerUnit,
        sale_price: pricePerUnit,
        image_url: product.image_url,
        quantity: parseFloat(weight),
      },
    });
  };

  // Agregar Fracción (1kg, 1/2kg, 1/4kg, suelta)
  const addFractionToCart = (product, fraction) => {
    const key = `fraccion-${product.id}-${fraction.id}`;
    const fractionPrice = parseFloat(fraction.price);
    dispatch({
      type: 'ADD_ITEM',
      payload: {
        key,
        item_type: 'fraccion',
        product_id: product.id,
        fraction_id: fraction.id,
        name: `${product.name} (${fraction.name})`,
        unit_price: fractionPrice,
        sale_price: fractionPrice,
        image_url: product.image_url,
        quantity: 1,
      },
    });
  };

  // Agregar Paquete Piñatero
  const addPackageToCart = (pkg, quantity = 1) => {
    const key = `paquete-${pkg.id}-base`;
    dispatch({
      type: 'ADD_ITEM',
      payload: {
        key,
        item_type: 'paquete',
        package_id: pkg.id,
        name: `[Paquete] ${pkg.name}`,
        unit_price: parseFloat(pkg.price),
        sale_price: parseFloat(pkg.price),
        quantity,
      },
    });
  };

  // Agregar Servicio (Helio, Envoltura, etc.)
  const addServiceToCart = (service, customPrice, quantity = 1) => {
    const unitPrice = parseFloat(customPrice !== undefined ? customPrice : service.base_price);
    const key = `servicio-${service.id}-${unitPrice}`;
    dispatch({
      type: 'ADD_ITEM',
      payload: {
        key,
        item_type: 'servicio',
        service_id: service.id,
        name: `[Servicio] ${service.name}`,
        unit_price: unitPrice,
        sale_price: unitPrice,
        quantity,
      },
    });
  };

  const removeFromCart = (itemKey) =>
    dispatch({ type: 'REMOVE_ITEM', payload: itemKey });

  const updateQuantity = (itemKey, quantity) =>
    dispatch({ type: 'UPDATE_QUANTITY', payload: { key: itemKey, quantity } });

  const clearCart = () => dispatch({ type: 'CLEAR' });

  const cartSubtotal = cartItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const cartTotal = cartSubtotal;
  const cartCount = cartItems.reduce((sum, item) => sum + (item.item_type === 'granel' ? 1 : item.quantity), 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        addBulkToCart,
        addFractionToCart,
        addPackageToCart,
        addServiceToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartSubtotal,
        cartTotal,
        cartCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

