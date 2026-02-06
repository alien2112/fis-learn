import apiClient from './client';

export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export const contactApi = {
  submit: async (data: ContactFormData): Promise<{ message: string }> => {
    const response = await apiClient.post('/contact', data);
    return response.data.data;
  },
};
