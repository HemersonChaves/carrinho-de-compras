import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}
interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {

  const [cart, setCart] = useState<Product[]>(() => {
    // verificar se localstorage possue o valor de carrinho armazenado
    // se nao retorna vetor vazio
    const storagedCart = localStorage.getItem('@RocketShoes:cart');
    if (storagedCart) {
      const cart_ = JSON.parse(storagedCart);
      return cart_;
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      //Atualizar Cart
      const updateCart: Product[] = [...cart];
      //Busca produto no carrinho
      const produtoExisteCart = updateCart.find(produto => produto.id === productId);

      //Busca os valores de estoque do carrinho
      const quantidadeProduto = (await api.get<Stock>(`/stock/${productId}`)).data;

      // define o valor da quantidade 
      const amount = (produtoExisteCart ? produtoExisteCart.amount : 0) + 1;

      if (amount > quantidadeProduto.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }
      // verifica se produto exist no carrinho
      if (!produtoExisteCart) {
        const produto = (await api.get(`/products/${productId}`)).data;

        // verifica se existe o produto no banco        
        if (!produto) {
          toast.error("Erro na adição do produto");
          return;
        }

        // verifica se tem a quantidade sulficiente de produto no estoque
        if (amount > quantidadeProduto.amount) {
          toast.warn("Quantidade solicitada fora de estoque");
          return;
        }
        const novoProduto = {
          ...produto,
          amount
        }
        updateCart.push(novoProduto);

      } else {
        produtoExisteCart.amount = amount;

      }
      setCart(updateCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart));
    } catch {
      toast.error("Erro na adição do produto");

    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updateCart = [...cart];

      const produtoIndex = updateCart.findIndex(produto => produto.id === productId);

      if (produtoIndex >= 0) {
        updateCart.splice(produtoIndex, 1);
        setCart(updateCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart));
      } else {

        throw Error();
      }
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
  //verifica se o estoque é menor que zero (1)
      if(amount <= 0){
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const estoques = (await api.get<Stock>(`/stock/${productId}`)).data;
      
      if (amount > estoques.amount ) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }
      //fonte https://cheatcode.co/tutorials/how-to-modify-an-existing-object-in-a-javascript-array
      const updateCart: Product[] = [...cart];

      const produtoExist = updateCart.find(produto => produto.id === productId);
      //Verifica se existe um produto com o id no cart
      if (produtoExist) {
        produtoExist.amount = amount;
        setCart(updateCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart));
      }else{
        throw Error();
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };
  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
