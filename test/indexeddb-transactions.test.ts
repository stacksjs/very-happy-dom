/**
 * IndexedDB transaction semantics.
 *
 * Regression guard for #1585: `abort()` fired its event and left every write in
 * place, so a rolled-back record stayed readable — the opposite of a browser.
 * `complete` was also queued from the transaction constructor, so it fired
 * ahead of every request's `success` and fired even for an aborted transaction.
 */

import { beforeEach, describe, expect, test } from 'bun:test'
import { Window } from '../src'

let factory: any
let dbCounter = 0

beforeEach(() => {
  factory = (new Window() as any).indexedDB
  dbCounter++
})

/** Open a database with one `rows` store keyed by `id`. */
async function database(): Promise<any> {
  const request = factory.open(`test-${dbCounter}-${Math.trunc(performance.now() * 1000)}`, 1)
  request.addEventListener('upgradeneeded', () => {
    request.result.createObjectStore('rows', { keyPath: 'id' })
  })
  return await new Promise((resolve) => {
    request.addEventListener('success', () => resolve(request.result))
  })
}

/** Resolve a request's result. */
function settled(request: any): Promise<any> {
  return new Promise(resolve => request.addEventListener('success', () => resolve(request.result)))
}

async function read(db: any, key: string): Promise<any> {
  return await settled(db.transaction('rows', 'readonly').objectStore('rows').get(key))
}

describe('aborting a transaction rolls back its writes', () => {
  test('a put made in the transaction is discarded', async () => {
    const db = await database()
    const transaction = db.transaction('rows', 'readwrite')

    await settled(transaction.objectStore('rows').put({ id: 'a' }))
    transaction.abort()

    expect(await read(db, 'a')).toBeUndefined()
  })

  test('a delete made in the transaction is undone', async () => {
    const db = await database()

    const seed = db.transaction('rows', 'readwrite')
    await settled(seed.objectStore('rows').put({ id: 'keep' }))

    const removing = db.transaction('rows', 'readwrite')
    await settled(removing.objectStore('rows').delete('keep'))
    removing.abort()

    expect(await read(db, 'keep')).toMatchObject({ id: 'keep' })
  })

  test('a clear made in the transaction is undone', async () => {
    const db = await database()

    const seed = db.transaction('rows', 'readwrite')
    await settled(seed.objectStore('rows').put({ id: 'one' }))

    const clearing = db.transaction('rows', 'readwrite')
    await settled(clearing.objectStore('rows').clear())
    clearing.abort()

    expect(await read(db, 'one')).toMatchObject({ id: 'one' })
  })

  test('writes committed by an earlier transaction are untouched', async () => {
    const db = await database()

    const committed = db.transaction('rows', 'readwrite')
    await settled(committed.objectStore('rows').put({ id: 'committed' }))
    await Bun.sleep(5)

    const rolledBack = db.transaction('rows', 'readwrite')
    await settled(rolledBack.objectStore('rows').put({ id: 'discarded' }))
    rolledBack.abort()

    expect(await read(db, 'committed')).toMatchObject({ id: 'committed' })
    expect(await read(db, 'discarded')).toBeUndefined()
  })

  test('aborting twice is harmless', async () => {
    const db = await database()
    const transaction = db.transaction('rows', 'readwrite')

    await settled(transaction.objectStore('rows').put({ id: 'a' }))
    transaction.abort()
    transaction.abort()

    expect(await read(db, 'a')).toBeUndefined()
  })

  test('abort reports itself', async () => {
    const db = await database()
    const transaction = db.transaction('rows', 'readwrite')
    let aborted = false
    transaction.addEventListener('abort', () => { aborted = true })

    await settled(transaction.objectStore('rows').put({ id: 'a' }))
    transaction.abort()

    expect(aborted).toBe(true)
    expect(transaction.aborted).toBe(true)
  })
})

describe('transaction event ordering', () => {
  test('success precedes complete', async () => {
    const db = await database()
    const transaction = db.transaction('rows', 'readwrite')
    const order: string[] = []

    transaction.addEventListener('complete', () => order.push('complete'))
    const request = transaction.objectStore('rows').put({ id: 'a' })
    request.addEventListener('success', () => order.push('success'))

    await Bun.sleep(10)

    // `complete` used to be queued from the constructor, so it landed first.
    expect(order).toEqual(['success', 'complete'])
  })

  test('an aborted transaction never completes', async () => {
    const db = await database()
    const transaction = db.transaction('rows', 'readwrite')
    const order: string[] = []

    transaction.addEventListener('complete', () => order.push('complete'))
    transaction.addEventListener('abort', () => order.push('abort'))

    await settled(transaction.objectStore('rows').put({ id: 'a' }))
    transaction.abort()
    await Bun.sleep(10)

    expect(order).toEqual(['abort'])
  })

  test('a transaction with no requests still completes', async () => {
    const db = await database()
    const transaction = db.transaction('rows', 'readwrite')
    let completed = false
    transaction.addEventListener('complete', () => { completed = true })

    await Bun.sleep(10)

    expect(completed).toBe(true)
  })
})

describe('transaction and store shape', () => {
  test('objectStoreNames is a DOMStringList with contains', async () => {
    const db = await database()

    // An upgrade handler guarding with `.contains(name)` used to hit a
    // TypeError, which open() then swallowed.
    expect(typeof db.objectStoreNames.contains).toBe('function')
    expect(db.objectStoreNames.contains('rows')).toBe(true)
    expect(db.objectStoreNames.contains('absent')).toBe(false)
    expect(db.objectStoreNames.item(0)).toBe('rows')
  })

  test('a transaction exposes its store names the same way', async () => {
    const db = await database()
    const transaction = db.transaction('rows', 'readonly')

    expect(transaction.objectStoreNames.contains('rows')).toBe(true)
  })

  test('a store reached through a transaction points back at it', async () => {
    const db = await database()
    const transaction = db.transaction('rows', 'readonly')

    expect(transaction.objectStore('rows').transaction).toBe(transaction)
  })

  test('a request carries its store and transaction', async () => {
    const db = await database()
    const transaction = db.transaction('rows', 'readwrite')
    const store = transaction.objectStore('rows')
    const request = store.put({ id: 'a' })

    expect(request.source).toBe(store)
    expect(request.transaction).toBe(transaction)
  })

  test('a readonly transaction takes no snapshots', async () => {
    const db = await database()

    const seed = db.transaction('rows', 'readwrite')
    await settled(seed.objectStore('rows').put({ id: 'a' }))
    await Bun.sleep(5)

    // Aborting a readonly transaction must not disturb committed data.
    const reading = db.transaction('rows', 'readonly')
    await settled(reading.objectStore('rows').get('a'))
    reading.abort()

    expect(await read(db, 'a')).toMatchObject({ id: 'a' })
  })
})
