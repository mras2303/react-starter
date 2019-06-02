import * as TYPES from "../actions/types";
import { AuthState, Action } from "../interfaces/authTypes";

const initState: AuthState = {
  isAuth: false,
  token: null,
  user: null,
  isLoading: false,
  errors: null
};

export default (state = initState, action: Action): AuthState => {
  switch (action.type) {
    case TYPES.LOGIN_SUCCESS:
      return {
        ...state,
        isAuth: true,
        token: action.token,
        isLoading: false,
        errors: null
      };
    case TYPES.LOGIN_ERROR:
      return {
        ...state,
        isAuth: false,
        token: null,
        isLoading: false,
        errors: action.errors
      };
    case TYPES.LOGIN_LOADING:
      return {
        ...state,
        isLoading: true
      };
    default:
      return state;
  }
};
