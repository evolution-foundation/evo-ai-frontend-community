import api from '@/services/core/api';
import { extractData } from '@/utils/apiHelpers';

export interface Motoboy {
  id: string;
  name: string;
  phone: string | null;
  vehicle_type: string;
  status: 'disponivel' | 'em_entrega' | 'offline';
  notes: string | null;
  active_deliveries_count: number;
}

// Cadastro dos motoboys próprios (ver Api::V1::Admin::MotoboysController) —
// usado no seletor de entregador da Ordem quando fulfillment_type é entrega
// e o courier escolhido é "motoboy_proprio".
class MotoboysService {
  async getMotoboys(): Promise<Motoboy[]> {
    const response = await api.get('/admin/motoboys');
    return extractData<Motoboy[]>(response);
  }
}

export const motoboysService = new MotoboysService();
