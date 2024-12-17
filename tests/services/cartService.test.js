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
    it('Debería crear un nuevo carrito y mutar el estado', async () => {
      // Mock de la creación del carrito
      const mockUserId = 1;
      Cart.create.mockResolvedValue({ userId: mockUserId, id: 1 });
  
      const result = await CartService.createCart(mockUserId);
  
      // Verifica que el carrito se ha creado en la base de datos
      expect(Cart.create).toHaveBeenCalledWith({ userId: mockUserId });
      expect(result).toEqual({ userId: mockUserId, id: 1 });
  
      // Verificar si el cambio realmente se refleja en la base de datos mockeada
      expect(Cart.create).toHaveBeenCalledTimes(1);  // COnfirmar que se llama una vez
    });
  });

  describe('addItemToCart', () => {
    const mockProduct = { id: 1, inventory: 10, price: 100 };
    const mockCartItem = { cartId: 1, productId: 1, quantity: 2 };

    it('Debería agregar un nuevo artículo al carrito cuando el producto existe y tiene suficiente inventario', async () => {
      Product.findByPk.mockResolvedValue(mockProduct);  // Mock de producto encontrado
      CartItem.findOne.mockResolvedValue(null);  // No existe el item previamente en el carrito
      CartItem.create.mockResolvedValue(mockCartItem); // Crear item en el carrito
  
      const result = await CartService.addItemToCart(1, 1, 2); // Agregar 2 unidades
  
      expect(Product.findByPk).toHaveBeenCalledWith(1);
      expect(CartItem.create).toHaveBeenCalledWith({ cartId: 1, productId: 1, quantity: 2 });
      expect(result).toEqual(mockCartItem);  // Verificar que el cart item se haya creado correctamente
    });

    it('Debería lanzar un error si el producto no se encuentra', async () => {
      Product.findByPk.mockResolvedValue(null);  // Producto no encontrado
      await expect(CartService.addItemToCart(1, 999, 2)).rejects.toThrow('Product not found');
    });
  
    it('Debería lanzar un error si no es suficiente inventario', async () => {
      Product.findByPk.mockResolvedValue({ ...mockProduct, inventory: 1 });  // Producto con inventario insuficiente
      await expect(CartService.addItemToCart(1, 1, 2)).rejects.toThrow('Not enough inventory available');
    });
  
    it('Debería actualizar la cantidad del artículo si el artículo ya existe en el carrito', async () => {
      // Simular un producto con inventario suficiente (por ejemplo, 10 unidades)
      const mockProduct = { id: 1, inventory: 10, price: 100 }; 

      // Simular un CartItem existente con cantidad 3
      const mockCartItem = { cartId: 1, productId: 1, quantity: 3, save: jest.fn() };

      // Mock de la respuesta de CartItem.findOne para encontrar el producto en el carrito
      CartItem.findOne.mockResolvedValue(mockCartItem);

      // Mock de CartItem.create (en caso de que no se encuentre el CartItem)
      CartItem.create.mockResolvedValue(mockCartItem);

      // Mock de Product.findByPk para simular la búsqueda de un producto
      Product.findByPk.mockResolvedValue(mockProduct);

      // Llamar al servicio con cantidad suficiente (por ejemplo, 2 unidades)
      const result = await CartService.addItemToCart(1, 1, 2);

      // Verificar la actualización de la cantidad
      expect(CartItem.findOne).toHaveBeenCalledWith({ where: { cartId: 1, productId: 1 } });
      expect(result.quantity).toBe(5); // La nueva cantidad es 3 (existente) + 2 (agregados)
    });

  });

  describe('getCartItems', () => {
    it('Debería devolver los elementos del carrito con totales calculados', async () => {
      // Mock de items en el carrito con precios e impuestos
      const mockItems = [
        { quantity: 2, Product: { price: 100, taxRate: 0.07 }, toJSON: jest.fn() },
        { quantity: 1, Product: { price: 200, taxRate: 0.07 }, toJSON: jest.fn() }
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
    it('Debería actualizar la cantidad del artículo del carrito cuando el inventario suficiente', async () => {
      // Simular un producto con inventario suficiente (por ejemplo, 10 unidades)
      const mockProduct = { id: 1, inventory: 10, price: 100 };

      // Simular un CartItem existente con cantidad 2
      const mockCartItem = { id: 1, cartId: 1, productId: 1, quantity: 2, Product: mockProduct, save: jest.fn() };

      // Mock de la respuesta de CartItem.findByPk (se debe devolver un CartItem con el Producto asociado)
      CartItem.findByPk.mockResolvedValue(mockCartItem);

      // Mock de Product.findByPk para simular la búsqueda de un producto
      Product.findByPk.mockResolvedValue(mockProduct);

      // Llamar al servicio para actualizar el CartItem con una nueva cantidad (5 unidades)
      const result = await CartService.updateCartItem(1, 5);

      // Verificar de la llamada a findByPk con el ID correcto y el include
      expect(CartItem.findByPk).toHaveBeenCalledWith(1, { include: Product });  // Cambiar la expectativa para incluir el objeto `include`
      expect(result.quantity).toBe(5); // La cantidad debe haberse actualizado a 5
    });
  
    it('Debería lanzar un error si no hay suficiente inventario disponible', async () => {
      // Mock de producto con inventario insuficiente
      const mockProduct = { id: 1, inventory: 3, price: 100 };
      const mockCartItem = { quantity: 5, Product: mockProduct, save: jest.fn() };
  
      CartItem.findByPk.mockResolvedValue(mockCartItem);
  
      await expect(CartService.updateCartItem(1, 5)).rejects.toThrow('Not enough inventory available');

    });

    it('Debería permitir la compra si el inventario es igual a la cantidad solicitada', async () => {
      // Mock de producto con inventario igual a la cantidad solicitada
      const mockProduct = { id: 1, inventory: 5, price: 100 };
      const mockCartItem = { quantity: 5, Product: mockProduct, save: jest.fn() };
    
      CartItem.findByPk.mockResolvedValue(mockCartItem);
    
      // Verificar que la compra se permita sin errores
      await expect(CartService.updateCartItem(1, 5)).resolves.not.toThrow();
    
      // Actualizar la expectativa para aceptar el objeto adicional que está siendo pasado
      expect(CartItem.findByPk).toHaveBeenCalledWith(1, expect.objectContaining({
        include: expect.anything(), // O ajusta esto según el objeto que realmente se pasa
      }));
    });

    it('Debería lanzar un error si no es suficiente inventario al actualizar la cantidad del elemento', async () => {
      // Simular un producto con inventario limitado (solo 5 unidades)
      const mockProduct = { id: 1, inventory: 5, price: 100 };
    
      // Simular un CartItem existente con 3 unidades
      const mockCartItem = { cartId: 1, productId: 1, quantity: 3, save: jest.fn() };
    
      // Mock de la respuesta de CartItem.findOne para encontrar el item en el carrito
      CartItem.findOne.mockResolvedValue(mockCartItem);
    
      // Mock de Product.findByPk para simular la búsqueda del producto
      Product.findByPk.mockResolvedValue(mockProduct);
    
      // Intentar actualizar la cantidad a 3 unidades más (total 6), lo que excede el inventario
      await expect(CartService.addItemToCart(1, 1, 3)).rejects.toThrow('Not enough inventory available');
    });

    it('Debería arrojar un error si el elemento no se encuentra', async () => {
      const itemId = 999; // Suponiendo que este ID no existe en la base de datos
      const quantity = 5;
  
      // Mock para simular que no se encuentra el CartItem
      CartItem.findByPk.mockResolvedValue(null);  // Simula que no se encuentra el CartItem
  
      // Verificar que se lanza el error adecuado
      await expect(CartService.updateCartItem(itemId, quantity)).rejects.toThrow('Item not found');
  
      // Validar que la función findByPk haya sido llamada con el ID correcto
      expect(CartItem.findByPk).toHaveBeenCalledWith(itemId, { include: Product });
    });

    
  });

  describe('removeCartItem', () => {
    it('Debería eliminar el artículo del carrito con éxito', async () => {
      const mockCartItem = { destroy: jest.fn() };

      CartItem.findByPk.mockResolvedValue(mockCartItem);

      await CartService.removeCartItem(1);

      expect(CartItem.findByPk).toHaveBeenCalledWith(1);
      expect(mockCartItem.destroy).toHaveBeenCalled();

    });

    it('Debería arrojar un error si el elemento no se encuentra', async () => {
      CartItem.findByPk.mockResolvedValue(null);  // No se encuentra el item
  
      await expect(CartService.removeCartItem(999)).rejects.toThrow('Item not found');
    });

  });
});