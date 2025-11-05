export interface ContactMessage {
  fromName: string;
  fromEmail: string;
  fromPhone?: string;
  message: string;
  recipients: string[];
}

