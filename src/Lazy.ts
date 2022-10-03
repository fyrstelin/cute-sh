export function Lazy<T1 extends object, T2 extends object>(
  target: T1,
  init: () => T2
): T1 & T2 {
  let instance: T2 | undefined
  return new Proxy(target, {
    get (target: any, prop) {
      // Get from original target
      if (target[prop]) {
        const res = target[prop]
        return typeof (res) === 'function' 
          ? res.bind(target)
          : res
      }

      // Or get from instance
      instance = instance ?? init()
      const res = (instance as any)[prop]

      return typeof (res) === 'function' 
        ? res.bind(instance)
        : res
    }
  }) as T1 & T2
}
