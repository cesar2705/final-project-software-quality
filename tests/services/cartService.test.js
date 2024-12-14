// Mock the models
jest.mock('../../models/cart', () => ({
  create: jest.fn(),
  findByPk: jest.fn()
}));

jest.mock('../../models/cartItem', () => ({
  findOne: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  findByPk: jest.fn()
}));

jest.mock('../../models/product', () => ({
  findByPk: jest.fn()
}));

const CartService = require('../../services/cartService');
const Cart = require('../../models/cart');
const CartItem = require('../../models/cartItem');
const Product = require('../../models/product');

describe('CartService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCart', () => {
    it('should create a new cart', async () => {
      // Mock de la creación del carrito
      const mockUserId = 1;
      Cart.create.mockResolvedValue({ userId: mockUserId, id: 1 });

      const result = await CartService.createCart(mockUserId);

      expect(Cart.create).toHaveBeenCalledWith({ userId: mockUserId });
      expect(result).toEqual({ userId: mockUserId, id: 1 });

    });
  });

  describe('addItemToCart', () => {
    const mockProduct = { id: 1, inventory: 10, price: 100 };
    const mockCartItem = { cartId: 1, productId: 1, quantity: 2 };

    it('should add new item to cart when product exists and has sufficient inventory', async () => {
      Product.findByPk.mockResolvedValue(mockProduct);  // Mock de producto encontrado
      CartItem.findOne.mockResolvedValue(null);  // No existe el item previamente en el carrito
      CartItem.create.mockResolvedValue(mockCartItem); // Crear item en el carrito
  
      const result = await CartService.addItemToCart(1, 1, 2); // Agregar 2 unidades
  
      expect(Product.findByPk).toHaveBeenCalledWith(1);
      expect(CartItem.create).toHaveBeenCalledWith({ cartId: 1, productId: 1, quantity: 2 });
      expect(result).toEqual(mockCartItem);  // Verificar que el cart item se haya creado correctamente
    });

    it('should throw error if product not found', async () => {
      Product.findByPk.mockResolvedValue(null);  // Producto no encontrado
      await expect(CartService.addItemToCart(1, 999, 2)).rejects.toThrow('Product not found');
    });
  
    it('should throw error if not enough inventory', async () => {
      Product.findByPk.mockResolvedValue({ ...mockProduct, inventory: 1 });  // Producto con inventario insuficiente
      await expect(CartService.addItemToCart(1, 1, 2)).rejects.toThrow('Not enough inventory available');
    });
  
    it('should update item quantity if item already exists in cart', async () => {
      // Simulando un producto con inventario suficiente (por ejemplo, 10 unidades)
      const mockProduct = { id: 1, inventory: 10, price: 100 }; 

      // Simulando un CartItem existente con cantidad 3
      const mockCartItem = { cartId: 1, productId: 1, quantity: 3, save: jest.fn() };

      // Mock de la respuesta de CartItem.findOne para encontrar el producto en el carrito
      CartItem.findOne.mockResolvedValue(mockCartItem);

      // Mock de CartItem.create (en caso de que no se encuentre el CartItem)
      CartItem.create.mockResolvedValue(mockCartItem);

      // Mock de Product.findByPk para simular la búsqueda de un producto
      Product.findByPk.mockResolvedValue(mockProduct);

      // Llamada al servicio con cantidad suficiente (por ejemplo, 2 unidades)
      const result = await CartService.addItemToCart(1, 1, 2);

      // Verificación de la actualización de la cantidad
      expect(CartItem.findOne).toHaveBeenCalledWith({ where: { cartId: 1, productId: 1 } });
      expect(result.quantity).toBe(5); // La nueva cantidad es 3 (existente) + 2 (agregados)
    });

  });

  describe('getCartItems', () => {
    it('should return cart items with calculated totals', async () => {
      // Mock de items en el carrito con precios e impuestos
      const mockItems = [
        { quantity: 2, Product: { price: 100, taxRate: 0.1 }, toJSON: jest.fn() },
        { quantity: 1, Product: { price: 200, taxRate: 0.1 }, toJSON: jest.fn() }
      ];
      CartItem.findAll.mockResolvedValue(mockItems);
  
      const result = await CartService.getCartItems(1);
  
      expect(CartItem.findAll).toHaveBeenCalledWith({
        where: { cartId: 1 },
        include: Product,
      });
  
      expect(result.items).toHaveLength(2);
      expect(result.summary.subtotal).toBe(400);
      expect(result.summary.totalTax).toBe(40);
      expect(result.summary.total).toBe(440);

    });
  });

  describe('updateCartItem', () => {
    it('should update cart item quantity when sufficient inventory', async () => {
      // Simulando un producto con inventario suficiente (por ejemplo, 10 unidades)
      const mockProduct = { id: 1, inventory: 10, price: 100 };

      // Simulando un CartItem existente con cantidad 2
      const mockCartItem = { id: 1, cartId: 1, productId: 1, quantity: 2, Product: mockProduct, save: jest.fn() };

      // Mock de la respuesta de CartItem.findByPk (se debe devolver un CartItem con el Producto asociado)
      CartItem.findByPk.mockResolvedValue(mockCartItem);

      // Mock de Product.findByPk para simular la búsqueda de un producto
      Product.findByPk.mockResolvedValue(mockProduct);

      // Llamada al servicio para actualizar el CartItem con una nueva cantidad (5 unidades)
      const result = await CartService.updateCartItem(1, 5);

      // Verificación de la llamada a findByPk con el ID correcto y el include
      expect(CartItem.findByPk).toHaveBeenCalledWith(1, { include: Product });  // Cambiar la expectativa para incluir el objeto `include`
      expect(result.quantity).toBe(5); // La cantidad debe haberse actualizado a 5
    });
  
    it('should throw error if not enough inventory is available', async () => {
      // Mock de producto con inventario insuficiente
      const mockProduct = { id: 1, inventory: 3, price: 100 };
      const mockCartItem = { quantity: 2, Product: mockProduct, save: jest.fn() };
  
      CartItem.findByPk.mockResolvedValue(mockCartItem);
  
      await expect(CartService.updateCartItem(1, 5)).rejects.toThrow('Not enough inventory available');

    });
  });

  describe('removeCartItem', () => {
    it('should remove cart item successfully', async () => {
      const mockCartItem = { destroy: jest.fn() };

      CartItem.findByPk.mockResolvedValue(mockCartItem);

      await CartService.removeCartItem(1);

      expect(CartItem.findByPk).toHaveBeenCalledWith(1);
      expect(mockCartItem.destroy).toHaveBeenCalled();

    });

    it('should throw error if item not found', async () => {
      CartItem.findByPk.mockResolvedValue(null);  // No se encuentra el item
  
      await expect(CartService.removeCartItem(999)).rejects.toThrow('Item not found');
    });

  });
});