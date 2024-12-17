const request = require('supertest');  
const express = require('express');    
const bodyParser = require('body-parser'); 
const { initTestDb, closeTestDb } = require('../setup/testDb'); 
const categoryRouter = require('../../routes/categories'); 
const Category = require('../../models/category'); 

// Creamos una instancia de la aplicación Express
const app = express();
app.use(bodyParser.json()); 
app.use('/api/categories', categoryRouter); 

describe('Category Routes', () => {

  // Antes de que se ejecuten todas las pruebas, inicializamos la base de datos de pruebas
  beforeAll(async () => {
    await initTestDb();
  });

  // Después de que todas las pruebas terminen, cerramos la base de datos de pruebas
  afterAll(async () => {
    await closeTestDb();
  });

  // Antes de cada prueba, eliminamos todas las categorías de la base de datos de pruebas
  beforeEach(async () => {
    await Category.destroy({ where: {} }); // Elimina todas las categorías en la base de datos de pruebas
  });
  
  describe('POST /api/categories', () => {

    it('Debería crear una nueva categoría', async () => {
      const categoryData = {
        name: 'Electronics', // Nueva categoría
      };

      // Realizar una solicitud POST a la ruta de categorías con los datos de la nueva categoría
      const response = await request(app)
        .post('/api/categories')  // Realizar el POST
        .send(categoryData)  // Enviar los datos de la categoría
        .expect(201); // Esperar un código de estado 201 (creado)

      // Verificar que la respuesta contenga el nombre y el ID de la categoría creada
      expect(response.body).toHaveProperty('name', 'Electronics');
      expect(response.body).toHaveProperty('id');
    });

    it('Debería devolver 400 si falta el nombre de la categoría', async () => {
      const categoryData = {}; // Enviar datos vacíos (sin nombre de categoría)

      // Realizar una solicitud POST a la ruta de categorías con los datos vacíos
      const response = await request(app)
        .post('/api/categories')
        .send(categoryData)  // Enviar los datos vacíos
        .expect(400); // Esperar un código de estado 400 (solicitud incorrecta)

      // Verificar que la respuesta contenga un campo de error
      expect(response.body).toHaveProperty('error');
    });

    //***** PARA MEJORAR COBERTURAS *****/
    /* */
    it('Debería devolver 500 al intentar crear una categoría duplicada', async () => {
      const categoryData = { name: 'Electronics' };
    
      // Crear la categoría inicial
      await Category.create(categoryData);
    
      // Intentar crear otra categoría con el mismo nombre
      const response = await request(app)
        .post('/api/categories')
        .send(categoryData)
        .expect(500);
    
      // Validar que se recibe un error adecuado
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch('Internal Server Error'); // Validar que el error menciona duplicado
    });

    it('Debería devolver 500 si ocurre un error del servidor', async () => {
      // Espiar el método create para simular un error
      jest.spyOn(Category, 'create').mockImplementation(() => {
        throw new Error('Internal Server Error');
      });
    
      const response = await request(app)
        .post('/api/categories')
        .send({ name: 'Electronics' })
        .expect(500);
    
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch('Internal Server Error');
    
      // Restaurar el método original
      Category.create.mockRestore();
    });

    it('Debería devolver una lista vacía si no hay categorías', async () => {
      const response = await request(app)
        .get('/api/categories')
        .expect(200);
    
      expect(response.body).toEqual([]); // Validar que la respuesta es un array vacío
    }); 
    
  });

  describe('GET /api/categories', () => {

    it('Debería devolver todas las categorías', async () => {
      // Crear categorías de prueba en la base de datos
      await Category.bulkCreate([
        { name: 'Electronics' },  
        { name: 'Books' },        
        { name: 'Clothing' },     
      ]);

      // Realizar una solicitud GET para obtener todas las categorías
      const response = await request(app)
        .get('/api/categories')
        .expect(200); // Esperar un código de estado 200 (OK)

      // Verificar que la respuesta contenga 3 categorías
      expect(response.body).toHaveLength(3); // Deberían retornar 3 categorías
      
      // Verificar que las categorías tengan los nombres esperados
      expect(response.body[0]).toHaveProperty('name', 'Electronics');
      expect(response.body[1]).toHaveProperty('name', 'Books');
      expect(response.body[2]).toHaveProperty('name', 'Clothing');
    });
    
  });


});