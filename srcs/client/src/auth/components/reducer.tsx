type actionType = 
| {type : 'SET_IS_AUTHENTICATED'; payload :boolean}
| {type : 'SET_IS_REGISTERED'; payload :boolean}
| {type : 'SET_IS_TWO_FACTOR_AUTHENTICATED'; payload :boolean}
| {type : 'SET_IS_TWO_FACTOR_AUTHENTICATION_ENABLED'; payload :boolean};

export type stateType = {
  isAuthenticated: boolean,
  isRegistered: boolean,
  isTwoFactorAuthenticated: boolean,
  isTwoFactorAuthenticationEnabled: boolean
}

function reducer(state: stateType, action: actionType) {
  switch(action.type) {
    case 'SET_IS_AUTHENTICATED' : 
      return {...state, isAuthenticated: action.payload}

    case 'SET_IS_REGISTERED' : 
      return {...state, isRegistered: action.payload}

    case 'SET_IS_TWO_FACTOR_AUTHENTICATED' : 
      return {...state, isTwoFactorAuthenticated: action.payload}

    case 'SET_IS_TWO_FACTOR_AUTHENTICATION_ENABLED' :
        return {...state, isTwoFactorAuthenticationEnabled: action.payload}
    
  }

  return state
}

export default reducer