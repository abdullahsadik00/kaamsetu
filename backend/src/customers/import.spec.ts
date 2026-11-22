import { parseCsv, readCustomerRows } from './import.js';

describe('parseCsv', () => {
  it('handles quotes, commas, new lines inside quotes, CRLF and the Excel BOM', () => {
    const text = '﻿name,address\r\n"Meera ""Didi""","Flat 2, Sai Heights\nKothrud"\r\n\r\nRahul,Shop 4\r\n';
    expect(parseCsv(text)).toEqual([
      ['name', 'address'],
      ['Meera "Didi"', 'Flat 2, Sai Heights\nKothrud'],
      ['Rahul', 'Shop 4'],
    ]);
  });

  it('keeps the last row when the file has no final new line', () => {
    expect(parseCsv('a,b\n1,')).toEqual([
      ['a', 'b'],
      ['1', ''],
    ]);
  });
});

describe('readCustomerRows', () => {
  it('accepts common header spellings and fills the customer and ACs', () => {
    const { rows, errors } = readCustomerRows(
      'Customer Name,Mobile Number,Address,Area,AC Count,Brand,Tons\n' +
        'Meera Test,98220 68001,"Flat 2, Sai Heights",Kothrud,2,Voltas,1.5\n' +
        'Rahul Test,+91 9822068002,Shop 4 Market Road,,,,\n',
    );
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      line: 2,
      customer: { name: 'Meera Test', phone: '+919822068001', site: { addressLine1: 'Flat 2, Sai Heights', locality: 'Kothrud' } },
      acs: { count: 2, brand: 'Voltas', capacityTons: 1.5 },
    });
    expect(rows[1].acs).toEqual({ count: 0, brand: null, capacityTons: null });
  });

  it('counts one AC when only brand or tons is given', () => {
    const { rows } = readCustomerRows('name,phone,address,ac brand\nMeera Test,9822068001,Flat 2,LG\n');
    expect(rows[0].acs.count).toBe(1);
  });

  it('reports each bad row with its spreadsheet line and keeps the good ones', () => {
    const { rows, errors } = readCustomerRows(
      'name,phone,address,ac tons,ac count\n' +
        'Meera Test,9822068001,Flat 2,1.5,1\n' +
        'X,12345,,7.3,many\n',
    );
    expect(rows).toHaveLength(1);
    expect(errors).toHaveLength(1);
    expect(errors[0].line).toBe(3);
    expect(errors[0].message).toMatch(/name/);
    expect(errors[0].message).toMatch(/phone/);
    expect(errors[0].message).toMatch(/addressLine1/);
    expect(errors[0].message).toMatch(/ac tons/);
    expect(errors[0].message).toMatch(/ac count/);
  });

  it('stops at the header when a required column is missing or one is unknown', () => {
    const { rows, errors } = readCustomerRows('name,phone,colour\nMeera Test,9822068001,blue\n');
    expect(rows).toEqual([]);
    expect(errors.map((e) => e.message)).toEqual(['Unknown column(s): colour', 'Missing column: address']);
  });

  it('says so when the file is empty', () => {
    expect(readCustomerRows('﻿\n').errors).toEqual([{ line: 1, message: 'The file is empty' }]);
  });
});
