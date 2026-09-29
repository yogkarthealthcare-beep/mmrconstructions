export interface BankDetailField {
  key: string;
  label: string;
  value: string;
  copyable?: boolean;
  isMonospace?: boolean;
  highlight?: boolean;
  isFullWidth?: boolean;
  subtext?: string;
}

export const COMPANY_BANK_DETAILS: BankDetailField[] = [
  {
    key: 'account_name',
    label: 'Account Name',
    value: 'MMR CONSTRUCTION AND DEVELOPERS PRIVATE LIMITED',
    copyable: true,
    highlight: true,
    isFullWidth: true
  },
  {
    key: 'account_number',
    label: 'Account Number',
    value: '9250020042828059',
    copyable: true,
    isMonospace: true,
    highlight: true,
    isFullWidth: false
  },
  {
    key: 'bank_name',
    label: 'Bank Name',
    value: 'AXIS BANK',
    copyable: true,
    highlight: true,
    isFullWidth: false
  },
  {
    key: 'ifsc_code',
    label: 'IFSC Code',
    value: 'UTIB0001087',
    copyable: true,
    isMonospace: true,
    highlight: true,
    isFullWidth: false
  },
  {
    key: 'branch_name',
    label: 'Branch Name',
    value: 'UNNAO',
    copyable: true,
    isFullWidth: false
  },
  {
    key: 'branch_address',
    label: 'Branch Address',
    value: 'Ground Floor, Plot No. 104, Civil Lines, Court Road, Unnao, Uttar Pradesh - 209801',
    copyable: true,
    isFullWidth: true
  },
  {
    key: 'bank_address',
    label: 'Bank Address',
    value: 'Axis Bank Ltd., Ground Floor, Plot No. 104, Civil Lines, Court Road, Unnao, Uttar Pradesh - 209801',
    copyable: true,
    isFullWidth: true
  }
];
