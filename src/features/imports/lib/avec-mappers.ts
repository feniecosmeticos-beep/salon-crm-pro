import {
  normalizeBrazilianDate,
  normalizeCurrency,
  normalizeEmail,
  normalizeNumber,
  normalizePhone,
  normalizeText,
} from "./normalizers";

type RawExcelRow = Record<string, unknown>;

export function mapClientRow(row: RawExcelRow): Record<string, unknown> {
  return {
    avec_code: normalizeText(readColumn(row, ["Código", "Codigo", "Cód.", "Cod."])),
    name: normalizeText(readColumn(row, ["Nome", "Cliente", "Nome do cliente"])),
    birth_date: normalizeBrazilianDate(
      readColumn(row, ["Aniversário", "Aniversario", "Data de nascimento"])
    ),
    phone: normalizePhone(readColumn(row, ["Telefone", "Fone"])),
    mobile: normalizePhone(readColumn(row, ["Celular", "Telefone celular", "WhatsApp"])),
    email: normalizeEmail(readColumn(row, ["E-mail", "Email"])),
    gender: normalizeText(readColumn(row, ["Sexo", "Gênero", "Genero"])),
    address: normalizeText(readColumn(row, ["Endereço", "Endereco", "Logradouro"])),
    city: normalizeText(readColumn(row, ["Cidade", "Município", "Municipio"])),
    district: normalizeText(readColumn(row, ["Bairro", "Distrito"])),
    registration_date: normalizeBrazilianDate(
      readColumn(row, ["Data de cadastro", "Cadastro", "Data cadastro"])
    ),
    notes: normalizeText(readColumn(row, ["Observações", "Observacoes", "Obs."])),
  };
}

export function mapAttendedClientRow(row: RawExcelRow): Record<string, unknown> {
  return {
    client_name: normalizeText(readColumn(row, ["Cliente", "Nome", "Nome do cliente"])),
    mobile: normalizePhone(readColumn(row, ["Celular", "Telefone celular", "WhatsApp"])),
    email: normalizeEmail(readColumn(row, ["E-mail", "Email"])),
    last_visit: normalizeBrazilianDate(
      readColumn(row, ["Última visita", "Ultima visita", "Data da última visita"])
    ),
    total_spent: normalizeCurrency(
      readColumn(row, ["Total consumido", "Valor consumido", "Total gasto"])
    ),
    professionals: normalizeText(
      readColumn(row, ["Profissionais", "Profissional", "Equipe"])
    ),
    total_visits: normalizeNumber(
      readColumn(row, ["Número de visitas", "Numero de visitas", "Visitas"])
    ),
  };
}

export function mapAppointmentRow(row: RawExcelRow): Record<string, unknown> {
  const grossValue = normalizeCurrency(readColumn(row, ["Valor", "Valor bruto"]));
  const discountValue = normalizeCurrency(readColumn(row, ["Desconto", "Valor desconto"]));
  const totalValue = normalizeCurrency(readColumn(row, ["Total", "Valor total"]));

  return {
    professional_name: normalizeText(
      readColumn(row, ["Profissional", "Profissionais"])
    ),
    appointment_date: normalizeBrazilianDate(
      readColumn(row, ["Data da comanda", "Data", "Data atendimento"])
    ),
    service_name: normalizeText(readColumn(row, ["Serviço", "Servico", "Procedimento"])),
    category: normalizeText(readColumn(row, ["Categoria", "Grupo"])),
    client_name: normalizeText(readColumn(row, ["Cliente", "Nome", "Nome do cliente"])),
    mobile: normalizePhone(readColumn(row, ["Celular", "Telefone celular", "WhatsApp"])),
    gross_value: grossValue,
    discount_value: discountValue,
    total_value:
      totalValue ?? calculateTotalValue(grossValue, discountValue) ?? grossValue,
  };
}

export function mapServiceRow(row: RawExcelRow): Record<string, unknown> {
  return {
    name: normalizeText(readColumn(row, ["Serviço", "Servico", "Nome", "Procedimento"])),
    category: normalizeText(readColumn(row, ["Categoria", "Grupo"])),
    standard_price: normalizeCurrency(readColumn(row, ["Valor", "Preço", "Preco"])),
  };
}

export function mapProductSaleRow(row: RawExcelRow): Record<string, unknown> {
  const quantity =
    normalizeNumber(readColumn(row, ["Quantidade", "Qtd.", "Qtd"])) ?? 1;
  const unitValue = normalizeCurrency(readColumn(row, ["Valor", "Valor unitário"]));
  const totalValue = normalizeCurrency(readColumn(row, ["Total", "Valor total"]));

  return {
    client_name: normalizeText(readColumn(row, ["Cliente", "Nome", "Nome do cliente"])),
    product_name: normalizeText(readColumn(row, ["Produto", "Item", "Nome do produto"])),
    brand: normalizeText(readColumn(row, ["Marca", "Fabricante"])),
    category: normalizeText(readColumn(row, ["Categoria", "Grupo"])),
    sale_date: normalizeBrazilianDate(
      readColumn(row, ["Data", "Data da venda", "Data venda", "Venda"])
    ),
    unit_value: unitValue,
    quantity,
    total_value: totalValue ?? (unitValue !== null ? unitValue * quantity : null),
  };
}

function readColumn(row: RawExcelRow, aliases: string[]): unknown {
  const normalizedAliases = aliases.map(normalizeColumnName);
  const matchingKey = Object.keys(row).find((key) =>
    normalizedAliases.includes(normalizeColumnName(key))
  );

  return matchingKey ? row[matchingKey] : null;
}

function normalizeColumnName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function calculateTotalValue(
  grossValue: number | null,
  discountValue: number | null
): number | null {
  if (grossValue === null) {
    return null;
  }

  return grossValue - (discountValue ?? 0);
}
