{
  description = "imply monorepo";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            bun
            go
            gopls
            gotools
            go-tools
            buf
            protoc-gen-es
            protoc-gen-go
            protoc-gen-connect-go
            tmux
          ];
        };
      }
    );
}
